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
from src.training import evaluate, find_best_threshold, train_one_epoch

app = ClientApp()


def load_message_arrays(model: nn.Module, message: Message) -> None:
    arrays = message.content["arrays"]
    model.load_state_dict(arrays.to_torch_state_dict())


@app.train()
def train(message: Message, context: Context) -> Message:
    print("-" * 50, "Training on client", context.node_config["partition-id"], "-" * 50)
    partition_id = context.node_config["partition-id"]
    mode = config_value(context, "mode", "iid")
    data_path = f"data/federated/{mode}/client_{int(partition_id) + 1}/train.json"
    validation_path = (
        f"data/federated/{mode}/client_{int(partition_id) + 1}/validation.json"
    )
    model, device, train_loader, validation_loader, criterion = create_local_state(
        context,
        data_path,
        validation_path,
    )
    load_message_arrays(model, message)

    config = message.content.get("config")
    if config is None:
        config = ConfigRecord({})
    learning_rate = float(
        config.get(
            "learning_rate",
            config_value(context, "learning_rate", 1e-3),
        )
    )
    local_epochs = int(
        config.get("local_epochs", config_value(context, "local_epochs", 1))
    )
    proximal_mu = float(
        config.get("proximal_mu", config_value(context, "proximal_mu", 0.001))
    )
    if proximal_mu < 0:
        raise ValueError("proximal_mu must be non-negative.")
    proximal_reference = (
        [parameter.detach().clone() for parameter in model.parameters()]
        if proximal_mu > 0
        else None
    )
    weight_decay = float(
        config.get("weight_decay", config_value(context, "weight_decay", 1e-4))
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
            "threshold_metric",
            config_value(context, "threshold_metric", "macro_f1"),
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
    metrics = MetricRecord(
        {
            "num-examples": len(train_loader.dataset),
            "train-loss": float(
                evaluate(model, train_loader, criterion, device)["loss"]
            ),
            "validation_score": float(validation_score),
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
    mode = config_value(context, "mode", "iid")
    client_dir = f"data/federated/{mode}/client_{int(partition_id) + 1}"
    model, device, _, validation_loader, criterion = create_local_state(
        context,
        f"{client_dir}/train.json",
        f"{client_dir}/validation.json",
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
