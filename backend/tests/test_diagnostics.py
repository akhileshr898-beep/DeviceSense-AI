import pytest
from backend.app import create_app
from backend.app.config import Config
from backend.app.db import init_db


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    AGENT_AUTH_TOKEN = "diag_test_token"
    LOOPBACK_ONLY = False


@pytest.fixture
def client():
    app = create_app(TestConfig)
    with app.test_client() as client:
        with app.app_context():
            init_db()
        yield client


def test_sustained_cpu_overload(client):
    headers = {"X-Agent-Token": "diag_test_token"}
    # Send 3 sustained high CPU samples
    samples = [
        {
            "cpu_percent": 94.0,
            "memory_percent": 50.0,
            "memory_available_bytes": 8000000000,
            "disk_free_bytes": 50000000000,
            "net_latency_ms": 30.0,
            "top_processes": [{"pid": 500, "name": "stress_cpu.exe", "cpu_percent": 90.0}],
        }
        for _ in range(4)
    ]
    payload = {"session_id": "cpu_test_session", "samples": samples}
    res = client.post("/api/v1/metrics/batch", json=payload, headers=headers)
    assert res.status_code == 201

    diag_res = client.get("/api/v1/diagnostics?status=active")
    assert diag_res.status_code == 200
    diags = diag_res.get_json()["diagnostics"]
    categories = [d["category"] for d in diags]
    assert "sustained_cpu" in categories


def test_brief_cpu_spike_no_false_persistent_alert(client):
    headers = {"X-Agent-Token": "diag_test_token"}
    # Send normal samples with only 1 single brief spike
    samples = [
        {"cpu_percent": 15.0, "memory_percent": 45.0, "disk_free_bytes": 50000000000, "net_latency_ms": 25.0},
        {"cpu_percent": 95.0, "memory_percent": 45.0, "disk_free_bytes": 50000000000, "net_latency_ms": 25.0}, # Single brief spike
        {"cpu_percent": 18.0, "memory_percent": 45.0, "disk_free_bytes": 50000000000, "net_latency_ms": 25.0},
    ]
    payload = {"session_id": "spike_test_session", "samples": samples}
    client.post("/api/v1/metrics/batch", json=payload, headers=headers)

    diag_res = client.get("/api/v1/diagnostics?status=active")
    diags = diag_res.get_json()["diagnostics"]
    # Single spike should NOT trigger sustained CPU alert
    assert not any(d["category"] == "sustained_cpu" and d["session_id"] == "spike_test_session" for d in diags)


def test_memory_pressure_finding(client):
    headers = {"X-Agent-Token": "diag_test_token"}
    samples = [
        {
            "cpu_percent": 25.0,
            "memory_percent": 94.0,
            "memory_available_bytes": 800 * 1024 * 1024, # 800 MB free (under 1.5GB threshold)
            "disk_free_bytes": 50000000000,
            "net_latency_ms": 25.0,
            "top_processes": [{"pid": 600, "name": "mem_hog.exe", "memory_rss_bytes": 7000000000, "memory_percent": 45.0}],
        }
        for _ in range(4)
    ]
    payload = {"session_id": "mem_test_session", "samples": samples}
    res = client.post("/api/v1/metrics/batch", json=payload, headers=headers)
    assert res.status_code == 201

    diag_res = client.get("/api/v1/diagnostics?status=active")
    diags = diag_res.get_json()["diagnostics"]
    assert any(d["category"] == "memory_pressure" for d in diags)


def test_no_duplicate_active_alerts_every_two_seconds(client):
    headers = {"X-Agent-Token": "diag_test_token"}
    sample = {
        "cpu_percent": 95.0,
        "memory_percent": 50.0,
        "memory_available_bytes": 8000000000,
        "disk_free_bytes": 50000000000,
        "net_latency_ms": 25.0,
        "top_processes": [{"pid": 700, "name": "heavy.exe", "cpu_percent": 92.0}],
    }
    # Send 5 batches with repeated identical abnormal samples
    for _ in range(5):
        client.post("/api/v1/metrics/batch", json={"session_id": "dedup_test", "samples": [sample]}, headers=headers)

    diag_res = client.get("/api/v1/diagnostics?status=active")
    diags = [d for d in diag_res.get_json()["diagnostics"] if d["session_id"] == "dedup_test"]
    # Only 1 unique active sustained_cpu finding should exist, not 5 duplicates
    assert len(diags) == 1

