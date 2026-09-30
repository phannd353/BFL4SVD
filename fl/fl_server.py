from __future__ import annotations

import torch
import torch.nn as nn
from flwr.app import ArrayRecord, ConfigRecord, Context, MetricRecord
from flwr.serverapp import Grid, ServerApp
from flwr.serverapp.strategy import FedAvg
from torch_geometric.loader import DataLoader

from src.data import load_json_records, records_to_graphs
from src.federated import (
    config_value,
    create_model,
    load_vocabulary,
)
from src.model import TokenGraphRGCN
from src.training import evaluate

app = ServerApp()


@app.main()
def main(grid: Grid, context: Context) -> None:
    vocabulary_path = config_value(context, "vocabulary", "shared_vocabulary.json")
    rounds = config_value(context, "rounds", 20)
    min_clients = config_value(context, "min_clients", 2)
    embedding_dim = config_value(context, "embedding_dim", 128)
    hidden_dim = config_value(context, "hidden_dim", 128)
    dropout = config_value(context, "dropout", 0.30)
    learning_rate = config_value(context, "learning_rate", 1e-3)
    output = config_value(context, "output", "federated_checkpoint.pt")
    mode = config_value(context, "mode", "iid")

    vocabulary = load_vocabulary(vocabulary_path)
    model = create_model(len(vocabulary), embedding_dim, hidden_dim, dropout)
    arrays = ArrayRecord(model.state_dict())

    strategy = FedAvg(
        fraction_train=1.0,
        fraction_evaluate=1.0,
        min_available_nodes=min_clients,
        min_train_nodes=min_clients,
        min_evaluate_nodes=min_clients,
    )
    best_checkpoint: dict[str, object] = {}

    strategy.start(
        grid=grid,
        initial_arrays=arrays,
        train_config=ConfigRecord(
            {
                "learning_rate": learning_rate,
                "local_epochs": config_value(context, "local_epochs", 1),
                "weight_decay": config_value(context, "weight_decay", 1e-4),
                "proximal_mu": config_value(context, "proximal_mu", 0.001),
                "mode": mode,
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
    model.load_state_dict(final_state)
    model.to(torch.device("cuda" if torch.cuda.is_available() else "cpu"))
    test_metrics = evaluate_server_split(
        context,
        model,
        vocabulary,
        split="test",
    )
    print(f"Selected round: {best_round} (highest server validation MCC)")
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
        },
        output,
    )
    print(f"Saved final global model to: {output}")


def evaluate_server_split(
    context: Context,
    model: TokenGraphRGCN,
    vocabulary: dict[str, int],
    split: str,
) -> dict[str, float]:
    device = next(model.parameters()).device
    batch_size = config_value(context, "batch_size", 32)
    mode = config_value(context, "mode", "iid")
    records = load_json_records(f"data/federated/{mode}/server/{split}.json")
    graph_kwargs = {
        "max_tokens": config_value(context, "max_tokens", 512),
        "context_window": config_value(context, "context_window", 2),
        "normalize_tokens": config_value(context, "normalize_tokens", False),
        "structural_edges": config_value(context, "structural_edges", True),
        "ast_edges": config_value(context, "ast_edges", False),
        "data_flow_edges": config_value(context, "data_flow_edges", False),
        "vocabulary": vocabulary,
    }
    graphs = records_to_graphs(records, **graph_kwargs)
    loader = DataLoader(graphs, batch_size=batch_size, shuffle=False)
    return evaluate(model, loader, nn.CrossEntropyLoss(), device)


def get_global_validation_fn(
    context: Context,
    model: TokenGraphRGCN,
    vocabulary: dict[str, int],
    best_checkpoint: dict[str, object],
):
    """Select and retain the global model with the best server validation MCC."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    validation_records = load_json_records(
        f"data/federated/{config_value(context, 'mode', 'iid')}/server/validation.json"
    )
    graph_kwargs = {
        "max_tokens": config_value(context, "max_tokens", 512),
        "context_window": config_value(context, "context_window", 2),
        "normalize_tokens": config_value(context, "normalize_tokens", False),
        "structural_edges": config_value(context, "structural_edges", True),
        "ast_edges": config_value(context, "ast_edges", False),
        "data_flow_edges": config_value(context, "data_flow_edges", False),
        "vocabulary": vocabulary,
    }
    validation_graphs = records_to_graphs(validation_records, **graph_kwargs)
    validation_loader = DataLoader(
        validation_graphs,
        batch_size=config_value(context, "batch_size", 32),
        shuffle=False,
    )
    criterion = nn.CrossEntropyLoss()

    def global_evaluate(server_round: int, arrays: ArrayRecord) -> MetricRecord:
        model.load_state_dict(arrays.to_torch_state_dict())
        metrics = evaluate(model, validation_loader, criterion, device)
        previous_mcc = float(best_checkpoint.get("mcc", -float("inf")))
        if metrics["mcc"] > previous_mcc:
            best_checkpoint["mcc"] = float(metrics["mcc"])
            best_checkpoint["round"] = server_round
            best_checkpoint["model_state_dict"] = {
                name: value.detach().cpu().clone()
                for name, value in model.state_dict().items()
            }
        return MetricRecord(
            {
                "accuracy": float(metrics["accuracy"]),
                "loss": float(metrics["loss"]),
                "mcc": float(metrics["mcc"]),
                "auc": float(metrics["auc"]),
            }
        )

    return global_evaluate
