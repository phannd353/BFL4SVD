from __future__ import annotations

import math
from collections.abc import Iterable

from flwr.app import ArrayRecord, Message, MetricRecord
from flwr.serverapp.strategy import FedAvg


class QualityFedAvg(FedAvg):
    """FedAvg that excludes low-scoring client updates before aggregation."""

    def __init__(
        self,
        *,
        threshold_metric: str = "macro_f1",
        min_client_score: float = 0.5,
        min_clients_to_aggregate: int = 2,
        **kwargs,
    ) -> None:
        if threshold_metric not in {"macro_f1", "mcc"}:
            raise ValueError("threshold_metric must be 'macro_f1' or 'mcc'.")
        if not math.isfinite(min_client_score):
            raise ValueError("min_client_score must be finite.")
        if min_clients_to_aggregate < 1:
            raise ValueError("min_clients_to_aggregate must be at least 1.")

        super().__init__(**kwargs)
        self.threshold_metric = threshold_metric
        self.min_client_score = min_client_score
        self.min_clients_to_aggregate = min_clients_to_aggregate

    def aggregate_train(
        self,
        server_round: int,
        replies: Iterable[Message],
    ) -> tuple[ArrayRecord, MetricRecord] | None:
        """Aggregate only updates whose client validation score clears the gate."""
        scored_replies: list[tuple[float, Message]] = []
        for reply in replies:
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
            print(f"Round {server_round}: no valid client scores; skipping aggregation.")
            return None

        accepted = [
            item for item in scored_replies if item[0] >= self.min_client_score
        ]
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
        return super().aggregate_train(server_round, accepted_replies)
