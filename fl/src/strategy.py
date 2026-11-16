from __future__ import annotations

import math
from collections.abc import Iterable
from pathlib import Path

import torch
from flwr.app import ArrayRecord, Message, MetricRecord
from flwr.serverapp.strategy import FedAvg

from src.hash import hash_state_dict
from src.services.training_rounds import create_training_round, update_training_round


class QualityFedAvg(FedAvg):
    """FedAvg that excludes low-scoring client updates before aggregation."""

    def __init__(
        self,
        *,
        threshold_metric: str = "macro-f1",
        min_client_score: float = 0.5,
        min_clients_to_aggregate: int = 2,
        api_endpoint: str | None = None,
        auth_token: str | None = None,
        training_job_id: str | None = None,
        initial_model_hash: str | None = None,
        num_rounds: int | None = None,
        model_dir: str = "data/model",
        **kwargs,
    ) -> None:
        if threshold_metric not in {"macro-f1", "macro_f1", "mcc"}:
            raise ValueError("threshold_metric must be 'macro_f1' or 'mcc'.")
        if not math.isfinite(min_client_score):
            raise ValueError("min-client-score must be finite.")
        if min_clients_to_aggregate < 1:
            raise ValueError("min-clients-to-aggregate must be at least 1.")

        super().__init__(**kwargs)
        self.threshold_metric = (
            "macro_f1" if threshold_metric == "macro-f1" else threshold_metric
        )
        self.min_client_score = min_client_score
        self.min_clients_to_aggregate = min_clients_to_aggregate
        integration_values = (
            api_endpoint,
            auth_token,
            training_job_id,
            initial_model_hash,
            num_rounds,
        )
        if any(value is not None for value in integration_values) and any(
            value is None for value in integration_values
        ):
            raise ValueError("All training server integration settings are required.")
        if num_rounds is not None and num_rounds < 1:
            raise ValueError("num_rounds must be positive.")
        self.api_endpoint = api_endpoint
        self.auth_token = auth_token
        self.training_job_id = training_job_id
        self.current_model_hash = initial_model_hash
        self.num_rounds = num_rounds
        self.model_dir = Path(model_dir)
        self.last_model_hash: str | None = None

    def create_first_round(self) -> None:
        if self.api_endpoint is None:
            return
        if self.current_model_hash is None:
            raise RuntimeError("Initial model hash is unavailable.")
        if self.auth_token is None or self.training_job_id is None:
            raise RuntimeError("Training server API credentials are unavailable.")
        create_training_round(
            self.api_endpoint,
            self.auth_token,
            self.training_job_id,
            1,
            self.current_model_hash,
        )

    def aggregate_train(
        self,
        server_round: int,
        replies: Iterable[Message],
    ) -> tuple[ArrayRecord, MetricRecord] | None:
        """Aggregate only updates whose client validation score clears the gate."""
        scored_replies: list[tuple[float, Message]] = []
        for reply in replies:
            if not reply.has_content():
                print(
                    f"Round {server_round}: excluding client reply without content."
                )
                continue
            metrics = reply.content.get("metrics")
            score = metrics.get("validation_score") if metrics is not None else None
            if isinstance(score, bool) or not isinstance(score, (int, float)):
                print(
                    f"Round {server_round}: excluding client update with missing "
                    "or invalid validation_score."
                )
                continue
            score = float(score)
            if not math.isfinite(score):
                print(
                    f"Round {server_round}: excluding client update with "
                    "non-finite validation_score."
                )
                continue
            scored_replies.append((score, reply))

        if not scored_replies:
            print(
                f"Round {server_round}: no valid client scores; skipping aggregation."
            )
            return None

        accepted = [item for item in scored_replies if item[0] >= self.min_client_score]
        minimum_to_keep = min(
            self.min_clients_to_aggregate,
            len(scored_replies),
        )
        if len(accepted) < minimum_to_keep:
            accepted = sorted(scored_replies, key=lambda item: item[0], reverse=True)[
                :minimum_to_keep
            ]

        accepted_replies = [reply for _, reply in accepted]
        rejected_count = len(scored_replies) - len(accepted_replies)
        print(
            f"Round {server_round}: accepted {len(accepted_replies)}/"
            f"{len(scored_replies)} client updates using "
            f"{self.threshold_metric} gate >= {self.min_client_score:.3f}; "
            f"rejected {rejected_count}."
        )
        result = super().aggregate_train(server_round, accepted_replies)
        if result is None:
            if self.api_endpoint is not None:
                raise RuntimeError(
                    f"Round {server_round} produced no aggregate; "
                    "the API round cannot be completed."
                )
            return None
        if self.api_endpoint is None:
            return result

        arrays, aggregate_metrics = result
        if (
            self.auth_token is None
            or self.training_job_id is None
            or self.num_rounds is None
            or self.current_model_hash is None
        ):
            raise RuntimeError("Training server API settings are unavailable.")
        state_dict = arrays.to_torch_state_dict()
        model_hash = hash_state_dict(state_dict)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        model_path = self.model_dir / f"{model_hash}.pt"
        torch.save(
            {name: value.detach().cpu() for name, value in state_dict.items()},
            model_path,
        )
        round_metrics = {
            name: value
            for name, value in aggregate_metrics.items()
            if isinstance(value, (int, float))
            and not isinstance(value, bool)
            and math.isfinite(float(value))
        }
        update_training_round(
            self.api_endpoint,
            self.auth_token,
            self.training_job_id,
            server_round,
            aggregated_model_hash=model_hash,
            aggregated_model_size=model_path.stat().st_size,
            aggregated_model_file_path=str(model_path.resolve()),
            metrics=round_metrics,
        )
        self.current_model_hash = model_hash
        self.last_model_hash = model_hash
        if server_round < self.num_rounds:
            create_training_round(
                self.api_endpoint,
                self.auth_token,
                self.training_job_id,
                server_round + 1,
                model_hash,
            )
        return result
