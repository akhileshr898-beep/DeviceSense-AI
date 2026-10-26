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


def test_cors_prefix_spoofing_blocked(client):
    # Attacker attempting domain prefix spoofing like localhost:5173.attacker.com
    res = client.post(
        "/api/v1/actions/some_action_id/approve",
        headers={"Origin": "http://localhost:5173.attacker.com"}
    )
    assert res.status_code == 403


def test_anti_csrf_on_dismiss_blocked(client):
    # Cross-origin dismiss attempt is blocked
    res = client.post(
        "/api/v1/diagnostics/diag_123/dismiss",
        headers={"Origin": "https://drive-by-exploit.com"}
    )
    assert res.status_code == 403


def test_anti_csrf_on_simulation_blocked(client):
    # Cross-origin simulation trigger attempt is blocked
    res = client.post(
        "/api/v1/simulation/trigger",
        json={"scenario": "cpu_overload"},
        headers={"Origin": "https://malicious-site.org"}
    )
    assert res.status_code == 403


def test_settings_uri_whitelist_enforced():
    # Attempting to launch arbitrary URI or shell injection is rejected
    with pytest.raises(ValueError, match="not in the permitted whitelist"):
        ActionCatalog._open_settings_uri("cmd.exe & calc.exe")

    with pytest.raises(ValueError, match="not in the permitted whitelist"):
        ActionCatalog._open_settings_uri("powershell.exe -enc XYZ")


def test_security_status_endpoint(client):
    res = client.get("/api/v1/security/status")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "secure"
    assert "loopback_isolation" in data["measures"]
    assert "dns_rebinding_defense" in data["measures"]
    assert "anti_csrf_protection" in data["measures"]
    assert "action_allowlist" in data["measures"]
    assert data["measures"]["action_allowlist"]["status"] == "active"


def test_correct_all_endpoint(client):
    res = client.post(
        "/api/v1/actions/correct-all",
        headers={"Origin": "http://localhost:5173"}
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "corrected_count" in data
