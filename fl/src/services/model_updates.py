from __future__ import annotations

from collections.abc import Mapping

from .api_client import _client


def create_model_update(
    api_endpoint: str,
    auth_token: str,
    update: Mapping[str, object],
    *,
    timeout: float = 15,
) -> object:
    required = {
        "score",
        "modelHash",
        "epoch",
        "learningRate",
        "batchSize",
        "accuracy",
        "trainingJobId",
        "roundNumber",
    }
    missing = required.difference(update)
    if missing:
        raise ValueError(
            f"update is missing required fields: {', '.join(sorted(missing))}"
        )
    return _client(api_endpoint, auth_token, timeout=timeout).request(
        "POST",
        "model-updates",
        update,
    )
