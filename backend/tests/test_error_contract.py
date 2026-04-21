import json
from types import SimpleNamespace

import pytest

from app.exceptions import TrackNotFoundError
from app.main import domain_exception_handler


@pytest.mark.asyncio
async def test_domain_error_response_uses_stable_contract():
    request = SimpleNamespace(
        state=SimpleNamespace(request_id="req-test"),
        url=SimpleNamespace(path="/api/v1/tracks/404"),
    )

    response = await domain_exception_handler(request, TrackNotFoundError())

    assert response.status_code == 404
    assert response.headers["x-request-id"] == "req-test"
    assert json.loads(response.body) == {
        "code": "track_not_found",
        "message": "Track not found",
        "request_id": "req-test",
    }
