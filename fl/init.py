import os
import tomllib
from pathlib import Path

import torch

from src.federated import create_model, load_vocabulary
from src.hash import hash_model


def main() -> None:
    with open("pyproject.toml", mode="rb") as fp:
        config = tomllib.load(fp)

    app_config = config["tool"]["flwr"]["app"]["config"]
    embedding_dim = app_config.get("embedding-dim", 128)
    hidden_dim = app_config.get("hidden-dim", 128)
    dropout = app_config.get("dropout", 0.30)
    vocabulary_path = app_config.get(
        "vocabulary",
        "data/federated/iid/vocabulary.json",
    )
    vocabulary = load_vocabulary(vocabulary_path)
    model = create_model(len(vocabulary), embedding_dim, hidden_dim, dropout)
    model_hash = hash_model(model)

    out_path = Path(os.environ.get("FLWR_MODEL_DIR", "../fl/data/model"))
    out_path.mkdir(exist_ok=True, parents=True)
    model_path = out_path / f"{model_hash}.pt"
    torch.save(
        {
            name: value.detach().cpu()
            for name, value in model.state_dict().items()
        },
        model_path,
    )
    print(f"Initial model saved to {model_path} with hash: {model_hash}")


if __name__ == "__main__":
    main()
