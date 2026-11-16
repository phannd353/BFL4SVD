from __future__ import annotations

import io
import json
import unittest
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError

from src.services.api_client import ServerAPIError, ServerAPIClient
from src.services.model_updates import create_model_update
from src.services.training_jobs import finalize_training_job
from src.services.training_rounds import (
    create_training_round,
    update_training_round,
)


class APIServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.response = MagicMock()
        self.response.__enter__.return_value.read.return_value = b'{"ok": true}'

    @patch("src.services.api_client.urlopen")
    def test_model_update_uses_participant_bearer_and_payload(self, urlopen) -> None:
        urlopen.return_value = self.response
        token = "participant-token"
        payload = {
            "score": "95",
            "modelHash": "model-hash",
            "epoch": "2",
            "learningRate": "1000",
            "batchSize": "32",
            "accuracy": "97",
            "trainingJobId": "job-id",
            "roundNumber": "1",
        }

        create_model_update("http://api.example.test", token, payload)

        request = urlopen.call_args.args[0]
        self.assertEqual(
            request.full_url,
            "http://api.example.test/api/v1/model-updates",
        )
        self.assertEqual(request.get_header("Authorization"), f"Bearer {token}")
        self.assertEqual(json.loads(request.data), payload)

    @patch("src.services.api_client.urlopen")
    def test_round_callbacks_preserve_lineage_and_encode_job_id(self, urlopen) -> None:
        urlopen.return_value = self.response

        create_training_round(
            "http://api.example.test/api/v1",
            "server-token",
            "job/1",
            1,
            "initial-hash",
        )
        update_training_round(
            "http://api.example.test",
            "server-token",
            "job/1",
            1,
            aggregated_model_hash="aggregate-hash",
            aggregated_model_size=100,
            aggregated_model_file_path="/models/aggregate.pt",
            metrics={"accuracy": 0.9},
        )

        start_request = urlopen.call_args_list[0].args[0]
        self.assertEqual(
            start_request.full_url,
            "http://api.example.test/api/v1/training-jobs/job%2F1/rounds/start",
        )
        self.assertEqual(
            json.loads(start_request.data),
            {"roundNumber": 1, "prevModelHash": "initial-hash"},
        )
        record_request = urlopen.call_args_list[1].args[0]
        self.assertEqual(
            json.loads(record_request.data),
            {
                "roundNumber": 1,
                "aggregatedModelHash": "aggregate-hash",
                "aggregatedModelSize": 100,
                "aggregatedModelFilePath": "/models/aggregate.pt",
                "metrics": {"accuracy": 0.9},
            },
        )

    @patch("src.services.api_client.urlopen")
    def test_finalize_reports_final_round_hash(self, urlopen) -> None:
        urlopen.return_value = self.response

        finalize_training_job(
            "http://api.example.test",
            "server-token",
            "job-id",
            "final-hash",
        )

        request = urlopen.call_args.args[0]
        self.assertEqual(
            request.full_url,
            "http://api.example.test/api/v1/training-jobs/job-id/finalize",
        )
        self.assertEqual(
            json.loads(request.data),
            {"finalModelHash": "final-hash"},
        )

    def test_http_error_does_not_expose_auth_token(self) -> None:
        token = "secret-server-token"
        error = HTTPError(
            "http://api.example.test",
            401,
            "unauthorized",
            {},
            io.BytesIO(token.encode()),
        )
        with patch("src.services.api_client.urlopen", side_effect=error):
            with self.assertRaises(ServerAPIError) as raised:
                ServerAPIClient("http://api.example.test", token).request("GET", "health")

        self.assertEqual(raised.exception.status, 401)
        self.assertNotIn(token, str(raised.exception))


if __name__ == "__main__":
    unittest.main()
