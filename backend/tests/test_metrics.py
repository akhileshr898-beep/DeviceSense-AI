import pytest
import os
import tempfile
from pathlib import Path
from backend.app import create_app
from backend.app.config import Config
from backend.app.db import SessionLocal, init_db
from backend.app.models.database import Base, Device, MetricSample
from backend.app.db import engine


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    AGENT_AUTH_TOKEN = "test_agent_secret_token"
    LOOPBACK_ONLY = False


@pytest.fixture
def client():
    app = create_app(TestConfig)
    with app.test_client() as client:
        with app.app_context():
            init_db()
        yield client


def test_health_check(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"


def test_metrics_batch_unauthenticated_rejected(client):
    payload = {"samples": [{"cpu_percent": 12.0, "memory_percent": 45.0}]}
    res = client.post("/api/v1/metrics/batch", json=payload)
    assert res.status_code == 401


def test_metrics_batch_invalid_payload(client):
    headers = {"X-Agent-Token": "test_agent_secret_token"}
    res = client.post("/api/v1/metrics/batch", json={"invalid": True}, headers=headers)
    assert res.status_code == 400


def test_metrics_batch_authenticated_success(client):
    headers = {"X-Agent-Token": "test_agent_secret_token"}
    payload = {
        "device": {
            "id": "test_device_win11",
            "hostname": "Test-PC",
            "os_version": "Windows 11 Test",
            "cpu_cores": 8,
        },
        "session_id": "test_session_1",
        "samples": [
            {
                "timestamp": "2026-10-26T12:00:00Z",
                "cpu_percent": 24.5,
                "memory_percent": 55.0,
                "memory_available_bytes": 8000000000,
                "memory_total_bytes": 16000000000,
                "disk_read_bytes_sec": 1024000,
                "disk_write_bytes_sec": 512000,
                "disk_free_bytes": 50000000000,
                "disk_total_bytes": 250000000000,
                "disk_percent": 80.0,
                "net_bytes_sent_sec": 50000,
                "net_bytes_recv_sec": 120000,
                "net_latency_ms": 25.0,
                "net_packet_loss_pct": 0.0,
                "battery_percent": 85.0,
                "battery_plugged": True,
                "top_processes": [{"pid": 1234, "name": "python.exe", "cpu_percent": 12.0}],
            }
        ],
    }

    res = client.post("/api/v1/metrics/batch", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.get_json()
    assert data["status"] == "success"
    assert data["inserted_count"] == 1

    # Verify latest metrics
    latest_res = client.get("/api/v1/metrics/latest")
    assert latest_res.status_code == 200
    latest_data = latest_res.get_json()
    assert latest_data["sample"]["cpu_percent"] == 24.5
    assert latest_data["sample"]["session_id"] == "test_session_1"


def test_metrics_history(client):
    headers = {"X-Agent-Token": "test_agent_secret_token"}
    payload = {
        "session_id": "history_test",
        "samples": [
            {
                "cpu_percent": 10.0 + i,
                "memory_percent": 50.0,
                "disk_free_bytes": 50000000000,
                "top_processes": [],
            }
            for i in range(5)
        ],
    }
    client.post("/api/v1/metrics/batch", json=payload, headers=headers)

    res = client.get("/api/v1/metrics/history?limit=10")
    assert res.status_code == 200
    data = res.get_json()
    assert data["count"] >= 5
