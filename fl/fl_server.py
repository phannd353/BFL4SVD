from __future__ import annotations

import os
from pathlib import Path

import torch
import torch.nn as nn
from flwr.app import ArrayRecord, ConfigRecord, Context, MetricRecord
from flwr.serverapp import Grid, ServerApp
from torch_geometric.loader import DataLoader

from src.data import load_json_records, records_to_graphs
from src.federated import (
    config_value,
    create_model,
    load_vocabulary,
)
from src.model import TokenGraphRGCN
from src.services.training_jobs import finalize_training_job
from src.strategy import QualityFedAvg
from src.training import evaluate, find_best_threshold

app = ServerApp()


@app.main()
def main(grid: Grid, context: Context) -> None:
    data_dir = config_value(context, "data-dir", "data/federated/iid/server")
    rounds = config_value(context, "rounds", 30)
    min_clients = config_value(context, "min-clients", 2)
    embedding_dim = config_value(context, "embedding-dim", 128)
    hidden_dim = config_value(context, "hidden-dim", 128)
    dropout = config_value(context, "dropout", 0.30)
    learning_rate = config_value(context, "learning-rate", 1e-3)
    output = config_value(context, "output", "federated-checkpoint.pt")
    threshold_metric = config_value(context, "threshold-metric", "macro-f1")

    vocabulary_path = config_value(
        context,
        "vocabulary",
        str(Path(data_dir).parent / "vocabulary.json"),
    )
    vocabulary = load_vocabulary(vocabulary_path)
    model = create_model(len(vocabulary), embedding_dim, hidden_dim, dropout)
    training_job_id = str(config_value(context, "training-job-id", ""))
    api_endpoint = str(config_value(context, "api-endpoint", ""))
    initial_model_hash = str(config_value(context, "initial-model-hash", ""))
    server_token = os.environ.get("FLWR_SERVER_TOKEN", "")
    model_dir = Path(os.environ.get("FLWR_MODEL_DIR", "data/model"))
    if training_job_id:
        if not api_endpoint or not initial_model_hash or not server_token:
            raise ValueError(
                "API training requires api-endpoint, initial-model-hash, and "
                "FLWR_SERVER_TOKEN."
            )
        initial_model_path = model_dir / f"{initial_model_hash}.pt"
        if not initial_model_path.is_file():
            raise FileNotFoundError(
                f"Initial model artifact not found: {initial_model_path}"
            )
        state_dict = torch.load(
            initial_model_path,
            map_location="cpu",
            weights_only=True,
        )
        if not isinstance(state_dict, dict):
            raise TypeError("Initial model artifact must contain a state dictionary.")
        model.load_state_dict(state_dict)
    arrays = ArrayRecord(model.state_dict())

    strategy = QualityFedAvg(
        fraction_train=1.0,
        fraction_evaluate=1.0,
        min_available_nodes=min_clients,
        min_train_nodes=min_clients,
        min_evaluate_nodes=min_clients,
        threshold_metric=threshold_metric,
        min_client_score=config_value(context, "min-client-score", 0.5),
        min_clients_to_aggregate=config_value(
            context,
            "min-clients-to-aggregate",
            min_clients,
        ),
        api_endpoint=api_endpoint if training_job_id else None,
        auth_token=server_token if training_job_id else None,
        training_job_id=training_job_id if training_job_id else None,
        initial_model_hash=initial_model_hash if training_job_id else None,
        num_rounds=rounds if training_job_id else None,
        model_dir=str(model_dir),
    )
    best_checkpoint: dict[str, object] = {}

    strategy.create_first_round()
    strategy.start(
        grid=grid,
        initial_arrays=arrays,
        train_config=ConfigRecord(
            {
                "learning-rate": learning_rate,
                "local-epochs": config_value(context, "local-epochs", 1),
                "weight-decay": config_value(context, "weight-decay", 1e-4),
                "proximal-mu": config_value(context, "proximal-mu", 0.001),
                "threshold-metric": threshold_metric,
            }
        ),
        num_rounds=rounds,
        evaluate_fn=get_global_validation_fn(
            context,
            model,
            vocabulary,
            best_checkpoint,
        ),
    )
    if "model_state_dict" not in best_checkpoint:
        raise RuntimeError("No global model was evaluated on server validation data.")
    final_state = best_checkpoint["model_state_dict"]
    if not isinstance(final_state, dict):
        raise TypeError("Best checkpoint has an invalid model state.")
    best_round = int(best_checkpoint["round"])
    if training_job_id:
        if strategy.last_model_hash is None:
            raise RuntimeError("Training completed without an aggregated model.")
        finalize_training_job(
            api_endpoint,
            server_token,
            training_job_id,
            strategy.last_model_hash,
        )
    model.load_state_dict(final_state)
    model.to(torch.device("cuda" if torch.cuda.is_available() else "cpu"))
    decision_threshold = float(best_checkpoint["threshold"])
    test_metrics = evaluate_server_split(
        context,
        model,
        vocabulary,
        split="test",
        threshold=decision_threshold,
    )
    print(
        f"Selected round: {best_round} "
        f"(best validation {threshold_metric}="
        f"{float(best_checkpoint['score']):.4f}, "
        f"threshold={decision_threshold:.2f})"
    )
    print(f"Final server test metrics: {test_metrics}")
    torch.save(
        {
            "model_state_dict": final_state,
            "vocabulary": vocabulary,
            "embedding_dim": embedding_dim,
            "hidden_dim": hidden_dim,
            "num_relations": 8,
            "rounds": rounds,
            "selected_round": best_round,
            "server_validation_mcc": float(best_checkpoint["mcc"]),
            "server_validation_score": float(best_checkpoint["score"]),
            "threshold_metric": threshold_metric,
            "decision_threshold": decision_threshold,
        },
        output,
    )
    print(f"Saved final global model to: {output}")


def evaluate_server_split(
    context: Context,
    model: TokenGraphRGCN,
    vocabulary: dict[str, int],
    split: str,
    threshold: float = 0.5,
) -> dict[str, float]:
    device = next(model.parameters()).device
    batch_size = config_value(context, "batch-size", 32)
    data_dir = config_value(context, "data-dir", "data/federated/iid/server")
    records = load_json_records(f"{data_dir}/{split}.json")
    graph_kwargs = {
        "max_tokens": config_value(context, "max-tokens", 512),
        "context_window": config_value(context, "context-window", 4),
        "normalize_tokens": config_value(context, "normalize-tokens", False),
        "structural_edges": config_value(context, "structural-edges", True),
        "ast_edges": config_value(context, "ast-edges", False),
        "data_flow_edges": config_value(context, "data-flow-edges", False),
        "vocabulary": vocabulary,
    }
    graphs = records_to_graphs(records, **graph_kwargs)
    loader = DataLoader(graphs, batch_size=batch_size, shuffle=False)
    return evaluate(
        model,
        loader,
        nn.CrossEntropyLoss(),
        device,
        threshold=threshold,
    )


def get_global_validation_fn(
    context: Context,
    model: TokenGraphRGCN,
    vocabulary: dict[str, int],
    best_checkpoint: dict[str, object],
):
    """Select the best checkpoint and threshold using server validation data."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    data_dir = config_value(context, "data-dir", "data/federated/iid/server")

    validation_records = load_json_records(f"{data_dir}/validation.json")
    graph_kwargs = {
        "max_tokens": config_value(context, "max-tokens", 512),
        "context_window": config_value(context, "context-window", 4),
        "normalize_tokens": config_value(context, "normalize-tokens", False),
        "structural_edges": config_value(context, "structural-edges", True),
        "ast_edges": config_value(context, "ast-edges", False),
        "data_flow_edges": config_value(context, "data-flow-edges", False),
        "vocabulary": vocabulary,
    }
    validation_graphs = records_to_graphs(validation_records, **graph_kwargs)
    validation_loader = DataLoader(
        validation_graphs,
        batch_size=config_value(context, "batch-size", 32),
        shuffle=False,
    )
    criterion = nn.CrossEntropyLoss()

    def global_evaluate(server_round: int, arrays: ArrayRecord) -> MetricRecord:
        model.load_state_dict(arrays.to_torch_state_dict())
        metrics = evaluate(model, validation_loader, criterion, device)
        threshold, score = find_best_threshold(
            model,
            validation_loader,
            criterion,
            device,
            metric=config_value(context, "threshold-metric", "macro-f1"),
        )
        if score > float(best_checkpoint.get("score", -float("inf"))):
            thresholded_metrics = evaluate(
                model,
                validation_loader,
                criterion,
                device,
                threshold=threshold,
            )
            best_checkpoint["score"] = score
            best_checkpoint["threshold"] = threshold
            best_checkpoint["mcc"] = thresholded_metrics["mcc"]
            best_checkpoint["round"] = server_round
            best_checkpoint["model_state_dict"] = {
                name: value.detach().cpu().clone()
                for name, value in model.state_dict().items()
            }
        result_metrics = {
            "accuracy": float(metrics["accuracy"]),
            "loss": float(metrics["loss"]),
            "mcc": float(metrics["mcc"]),
            "auc": float(metrics["auc"]),
            "threshold": float(threshold),
            "threshold_metric_score": float(score),
        }
        return MetricRecord(
            {
                name: value
                for name, value in result_metrics.items()
                if torch.isfinite(torch.tensor(value)).item()
            }
        )

    return global_evaluate
