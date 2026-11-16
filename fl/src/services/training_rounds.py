from __future__ import annotations

from collections.abc import Mapping
from urllib.parse import quote

from .api_client import _client


def create_training_round(
    api_endpoint: str,
    auth_token: str,
    job_id: str,
    round_number: int,
    prev_model_hash: str,
    *,
    timeout: float = 15,
) -> object:
    if not job_id:
        raise ValueError("job_id is required")
    if isinstance(round_number, bool) or not isinstance(round_number, int):
        raise ValueError("round_number must be a positive integer")
    if round_number < 1:
        raise ValueError("round_number must be a positive integer")
    if not prev_model_hash:
        raise ValueError("prev_model_hash is required")
    return _client(api_endpoint, auth_token, timeout=timeout).request(
        "POST",
        f"training-jobs/{quote(job_id, safe='')}/rounds/start",
        {"roundNumber": round_number, "prevModelHash": prev_model_hash},
    )


def update_training_round(
    api_endpoint: str,
    auth_token: str,
    job_id: str,
    round_number: int,
    *,
    aggregated_model_hash: str,
    aggregated_model_size: int,
    aggregated_model_file_path: str,
    metrics: Mapping[str, object] | None = None,
    timeout: float = 15,
) -> object:
    if not job_id:
        raise ValueError("job_id is required")
    if isinstance(round_number, bool) or not isinstance(round_number, int):
        raise ValueError("round_number must be a positive integer")
    if round_number < 1:
        raise ValueError("round_number must be a positive integer")
    if not aggregated_model_hash or not aggregated_model_file_path:
        raise ValueError("aggregate model hash and file path are required")
    if (
        isinstance(aggregated_model_size, bool)
        or not isinstance(aggregated_model_size, int)
        or aggregated_model_size < 1
    ):
        raise ValueError("aggregated_model_size must be a positive integer")
    if metrics is not None and not isinstance(metrics, Mapping):
        raise ValueError("metrics must be a mapping")

    payload: dict[str, object] = {
        "roundNumber": round_number,
        "aggregatedModelHash": aggregated_model_hash,
        "aggregatedModelSize": aggregated_model_size,
        "aggregatedModelFilePath": aggregated_model_file_path,
    }
    if metrics is not None:
        payload["metrics"] = dict(metrics)
    return _client(api_endpoint, auth_token, timeout=timeout).request(
        "POST",
        f"training-jobs/{quote(job_id, safe='')}/rounds",
        payload,
    )
