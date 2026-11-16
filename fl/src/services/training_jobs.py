from __future__ import annotations

from urllib.parse import quote

from .api_client import _client


def finalize_training_job(
    api_endpoint: str,
    auth_token: str,
    job_id: str,
    model_hash: str,
    *,
    timeout: float = 15,
) -> object:
    if not job_id:
        raise ValueError("job_id is required")
    if not model_hash:
        raise ValueError("model_hash is required")
    return _client(api_endpoint, auth_token, timeout=timeout).request(
        "POST",
        f"training-jobs/{quote(job_id, safe='')}/finalize",
        {"finalModelHash": model_hash},
    )
