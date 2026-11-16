from __future__ import annotations

import json
import re
from collections.abc import Mapping
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen

_TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9._~+/=-]+$")


class ServerAPIError(RuntimeError):
    """Raised when a request to the training API fails."""

    def __init__(self, status: int | None, message: str) -> None:
        self.status = status
        super().__init__(message)


class ServerAPIClient:
    def __init__(
        self,
        api_endpoint: str,
        auth_token: str,
        *,
        timeout: float = 15,
    ) -> None:
        if not api_endpoint:
            raise ValueError("api_endpoint is required")
        if not auth_token:
            raise ValueError("auth_token is required")
        if not _TOKEN_PATTERN.fullmatch(auth_token):
            raise ValueError("auth_token contains invalid characters")
        if timeout <= 0:
            raise ValueError("timeout must be positive")

        parsed = urlsplit(api_endpoint.rstrip("/"))
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("api_endpoint must be an absolute HTTP(S) URL")
        path = parsed.path.rstrip("/")
        if not path.endswith("/api/v1"):
            path = f"{path}/api/v1"
        self.base_url = urlunsplit((parsed.scheme, parsed.netloc, path, "", ""))
        self.auth_token = auth_token
        self.timeout = timeout

    def request(
        self,
        method: str,
        path: str,
        payload: Mapping[str, object] | None = None,
    ) -> object:
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {self.auth_token}",
        }
        data = None
        if payload is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(payload, allow_nan=False).encode("utf-8")

        request = Request(
            f"{self.base_url}/{path.lstrip('/')}",
            data=data,
            headers=headers,
            method=method,
        )
        try:
            with urlopen(request, timeout=self.timeout) as response:
                body = response.read()
        except HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            detail = detail.replace(self.auth_token, "[REDACTED]")
            raise ServerAPIError(
                error.code,
                f"Server API returned HTTP {error.code}: {detail or error.reason}",
            ) from error
        except URLError as error:
            raise ServerAPIError(
                None, f"Could not reach server API: {error.reason}"
            ) from error

        if not body:
            return None
        try:
            return json.loads(body)
        except json.JSONDecodeError as error:
            raise ServerAPIError(
                None, "Server API returned a non-JSON response"
            ) from error


def _client(
    api_endpoint: str,
    auth_token: str,
    *,
    timeout: float = 15,
) -> ServerAPIClient:
    return ServerAPIClient(api_endpoint, auth_token, timeout=timeout)
