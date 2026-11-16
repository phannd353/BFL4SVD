from __future__ import annotations

import hashlib
from collections.abc import Mapping

import torch


def hash_state_dict(state_dict: Mapping[str, torch.Tensor]) -> str:
    """Hash tensor state independently of device and serialization metadata."""
    digest = hashlib.sha256()
    for name, value in sorted(state_dict.items()):
        if not isinstance(value, torch.Tensor):
            raise TypeError(f"Model state entry {name!r} is not a tensor.")
        tensor = value.detach().cpu().contiguous()
        digest.update(name.encode("utf-8"))
        digest.update(str(tensor.dtype).encode("ascii"))
        digest.update(repr(tuple(tensor.shape)).encode("ascii"))
        digest.update(tensor.view(torch.uint8).numpy().tobytes())
    return digest.hexdigest()


def hash_model(model: torch.nn.Module) -> str:
    return hash_state_dict(model.state_dict())
