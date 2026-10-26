import pytest
from backend.app import create_app
from backend.app.config import Config
from backend.app.db import init_db
from backend.app.services.action_catalog import ActionCatalog


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    AGENT_AUTH_TOKEN = "secure_token_xyz"
    LOOPBACK_ONLY = False


@pytest.fixture
def client():
    app = create_app(TestConfig)
    with app.test_client() as client:
        with app.app_context():
            init_db()
        yield client


def test_agent_unauthenticated_rejected(client):
    res = client.post("/api/v1/metrics/batch", json={"samples": []})
    assert res.status_code == 401


def test_agent_wrong_token_rejected(client):
    res = client.post(
        "/api/v1/metrics/batch",
        json={"samples": []},
        headers={"X-Agent-Token": "invalid_wrong_token"}
    )
    assert res.status_code == 401


def test_arbitrary_actions_strictly_blocked():
    # Verify that disallowed commands cannot be executed through ActionCatalog
    forbidden = [
        "delete_system32",
        "reg_delete",
        "rmdir_c",
        "powershell_arbitrary",
        "format_disk",
    ]
    for cmd in forbidden:
        assert not ActionCatalog.is_allowed(cmd)
        with pytest.raises(ValueError):
            ActionCatalog.execute(cmd)


def test_disallowed_cross_origin_blocked(client):
    # Cross-origin request from malicious site is blocked
    res = client.post(
        "/api/v1/actions/some_action_id/approve",
        headers={"Origin": "https://malicious-external-site.com"}
    )
    assert res.status_code == 403
