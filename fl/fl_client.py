from __future__ import annotations

import torch
import torch.nn as nn
from flwr.app import (
    ArrayRecord,
    ConfigRecord,
    Context,
    Message,
    MetricRecord,
    RecordDict,
)
from flwr.clientapp import ClientApp

from src.federated import config_value, create_local_state
from src.hash import hash_model
from src.services.model_updates import create_model_update
from src.training import evaluate, find_best_threshold, train_one_epoch

app = ClientApp()


def load_message_arrays(model: nn.Module, message: Message) -> None:
    arrays = message.content["arrays"]
    model.load_state_dict(arrays.to_torch_state_dict())


@app.train()
def train(message: Message, context: Context) -> Message:
    partition_id = context.node_config["partition-id"]
    print("-" * 50, "Training on client", partition_id, "-" * 50)
    data_dir = config_value(
        context,
        "data-dir",
        f"data/federated/iid/client_{int(partition_id) + 1}",
    )

    model, device, train_loader, validation_loader, criterion = create_local_state(
        context,
        f"{data_dir}/train.json",
        f"{data_dir}/validation.json",
    )
    load_message_arrays(model, message)

    config = message.content.get("config")
    if config is None:
        config = ConfigRecord({})
    learning_rate = float(
        config.get(
            "learning-rate",
            config_value(context, "learning-rate", 1e-3),
        )
    )
    local_epochs = int(
        config.get("local-epochs", config_value(context, "local-epochs", 1))
    )
    proximal_mu = float(
        config.get("proximal-mu", config_value(context, "proximal-mu", 0.001))
    )
    if proximal_mu < 0:
        raise ValueError("proximal_mu must be non-negative.")
    proximal_reference = (
        [parameter.detach().clone() for parameter in model.parameters()]
        if proximal_mu > 0
        else None
    )
    weight_decay = float(
        config.get("weight-decay", config_value(context, "weight-decay", 1e-4))
    )
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=learning_rate,
        weight_decay=weight_decay,
    )

    for _ in range(local_epochs):
        train_one_epoch(
            model,
            train_loader,
            optimizer,
            criterion,
            device,
            proximal_reference=proximal_reference,
            proximal_mu=proximal_mu,
        )

    threshold_metric = str(
        config.get(
            "threshold-metric",
            config_value(context, "threshold-metric", "macro-f1"),
        )
    )
    validation_threshold, validation_score = find_best_threshold(
        model,
        validation_loader,
        criterion,
        device,
        metric=threshold_metric,
    )
    validation_metrics = evaluate(
        model,
        validation_loader,
        criterion,
        device,
        threshold=validation_threshold,
    )
    run_config = context.run_config
    api_endpoint = str(run_config.get("api-endpoint", ""))
    training_job_id = str(run_config.get("training-job-id", ""))
    auth_token = str(context.node_config.get("auth-token", ""))
    score = float(validation_score)
    if not torch.isfinite(torch.tensor(score)):
        raise ValueError("Validation score must be finite.")
    accuracy = float(validation_metrics["accuracy"])
    learning_rate = float(
        config.get("learning-rate", config_value(context, "learning-rate", 1e-3))
    )
    batch_size = config_value(context, "batch-size", 32)
    train_metrics = {
        "train_loss": float(evaluate(model, train_loader, criterion, device)["loss"]),
        "validation_score": score,
        "validation_threshold": float(validation_threshold),
        "validation_mcc": float(validation_metrics["mcc"]),
        "validation_accuracy": accuracy,
        "validation_macro_f1": float(validation_metrics["macro_f1"]),
    }
    if any((api_endpoint, training_job_id, auth_token)):
        if not api_endpoint or not training_job_id or not auth_token:
            raise ValueError(
                "API callbacks require an endpoint, training job ID, and "
                "participant credential."
            )
        round_config = message.content.get("config")
        if round_config is None:
            raise ValueError("Flower training message is missing round configuration.")
        round_number = int(round_config["server-round"])
        if round_number < 1:
            raise ValueError("Flower server round must be positive.")
        threshold_metric = str(
            config.get(
                "threshold-metric",
                config_value(context, "threshold-metric", "macro-f1"),
            )
        )
        if threshold_metric == "mcc":
            if not -1 <= score <= 1:
                raise ValueError("MCC validation score must be between -1 and 1.")
            chain_score = round((score + 1) * 50)
        else:
            if not 0 <= score <= 1:
                raise ValueError("Macro-F1 validation score must be between 0 and 1.")
            chain_score = round(score * 100)
        create_model_update(
            api_endpoint,
            auth_token,
            {
                "score": str(chain_score),
                "modelHash": hash_model(model),
                "epoch": str(local_epochs),
                "learningRate": str(round(learning_rate * 1_000_000)),
                "batchSize": str(batch_size),
                "accuracy": str(round(accuracy * 100)),
                "metrics": train_metrics,
                "trainingJobId": training_job_id,
                "roundNumber": str(round_number),
            },
        )
    metrics = MetricRecord(
        {
            "num-examples": len(train_loader.dataset),
            "train-loss": train_metrics["train_loss"],
            "validation_score": score,
            "validation_threshold": float(validation_threshold),
            "validation_mcc": float(validation_metrics["mcc"]),
        }
    )
    return Message(
        content=RecordDict(
            {
                "arrays": ArrayRecord(model.state_dict()),
                "metrics": metrics,
            }
        ),
        reply_to=message,
    )


@app.evaluate()
def evaluate_client(message: Message, context: Context) -> Message:
    partition_id = context.node_config["partition-id"]
    data_dir = config_value(
        context,
        "data-dir",
        f"data/federated/iid/client_{int(partition_id) + 1}",
    )
    model, device, _, validation_loader, criterion = create_local_state(
        context,
        f"{data_dir}/train.json",
        f"{data_dir}/validation.json",
    )
    load_message_arrays(model, message)
    metrics = evaluate(model, validation_loader, criterion, device)
    return Message(
        content=RecordDict(
            {
                "metrics": MetricRecord(
                    {
                        "num-examples": len(validation_loader.dataset),
                        "loss": float(metrics["loss"]),
                        "accuracy": float(metrics["accuracy"]),
                        "mcc": float(metrics["mcc"]),
                        "auc": float(metrics["auc"]),
                    }
                )
            }
        ),
        reply_to=message,
    )
