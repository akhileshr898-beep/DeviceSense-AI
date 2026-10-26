import pytest
from backend.app import create_app
from backend.app.config import Config
from backend.app.db import init_db
from backend.app.services.action_catalog import ActionCatalog


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    AGENT_AUTH_TOKEN = "action_test_token"
    LOOPBACK_ONLY = False


@pytest.fixture
def client():
    app = create_app(TestConfig)
    with app.test_client() as client:
        with app.app_context():
            init_db()
        yield client


def test_action_catalog(client):
    res = client.get("/api/v1/actions/catalog")
    assert res.status_code == 200
    data = res.get_json()
    assert "clean_temp_cache" in data["allowed_actions"]
    assert "trim_process_working_set" in data["allowed_actions"]
    assert "flush_dns" in data["allowed_actions"]


def test_approve_and_verify_action(client):
    # Setup a scenario
    headers = {"X-Agent-Token": "action_test_token"}
    samples = [
        {
            "cpu_percent": 15.0,
            "memory_percent": 92.0,
            "memory_available_bytes": 900 * 1024 * 1024,
            "disk_free_bytes": 50000000000,
            "net_latency_ms": 25.0,
            "top_processes": [{"pid": 111, "name": "app.exe", "memory_rss_bytes": 5000000000}],
        }
        for _ in range(4)
    ]
    client.post("/api/v1/metrics/batch", json={"session_id": "act_sess", "samples": samples}, headers=headers)

    diag_res = client.get("/api/v1/diagnostics?status=active")
    diags = diag_res.get_json()["diagnostics"]
    assert len(diags) > 0
    rec = diags[0]["recommendations"][0]

    # Approve action
    appr_res = client.post(
        f"/api/v1/actions/{rec['id']}/approve",
        headers={"Origin": "http://localhost:5173"}
    )
    assert appr_res.status_code == 200
    appr_data = appr_res.get_json()
    assert appr_data["status"] == "success"
    assert "verification" in appr_data
    assert appr_data["verification"]["outcome"] in ("improved", "unchanged", "worsened", "inconclusive")


def test_reject_action(client):
    headers = {"X-Agent-Token": "action_test_token"}
    samples = [
        {
            "cpu_percent": 94.0,
            "memory_percent": 50.0,
            "memory_available_bytes": 8000000000,
            "disk_free_bytes": 50000000000,
            "net_latency_ms": 25.0,
            "top_processes": [{"pid": 222, "name": "heavy.exe", "cpu_percent": 90.0}],
        }
        for _ in range(4)
    ]
    client.post("/api/v1/metrics/batch", json={"session_id": "rej_sess", "samples": samples}, headers=headers)

    diag_res = client.get("/api/v1/diagnostics?status=active")
    diags = diag_res.get_json()["diagnostics"]
    rec = diags[0]["recommendations"][0]

    # Reject action with reason
    rej_res = client.post(
        f"/api/v1/actions/{rec['id']}/reject",
        json={"reason": "Currently executing an urgent compilation job"},
        headers={"Origin": "http://localhost:5173"}
    )
    assert rej_res.status_code == 200
    rej_data = rej_res.get_json()
    assert rej_data["action_event"]["status"] == "rejected"
    assert "compilation" in rej_data["action_event"]["rejection_reason"]
