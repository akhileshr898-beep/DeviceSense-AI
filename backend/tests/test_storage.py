import pytest
from backend.app.services.storage_service import get_system_storage


def test_system_storage_service():
    storage = get_system_storage()
    assert isinstance(storage, dict)
    assert "drives" in storage
    assert "primary" in storage
    assert "aggregate" in storage
    assert "is_available" in storage

    if storage["drives"]:
        for d in storage["drives"]:
            assert "drive" in d
            assert "label" in d
            assert "total_bytes" in d
            assert "available_bytes" in d
            assert "used_bytes" in d
            assert "percent" in d

            # Requirement 2: used storage = total storage - available storage
            assert d["used_bytes"] == max(0.0, d["total_bytes"] - d["available_bytes"])

            # Requirement 4: percent = (used storage / total storage) * 100
            if d["total_bytes"] > 0:
                expected_pct = round((d["used_bytes"] / d["total_bytes"]) * 100.0, 2)
                assert abs(d["percent"] - expected_pct) < 0.05


def test_storage_endpoint(client):
    res = client.get("/api/v1/storage")
    assert res.status_code == 200
    data = res.get_json()
    assert "status" in data
    assert "drives" in data
    assert "primary" in data
    assert "aggregate" in data

    if data["drives"]:
        primary = data["primary"]
        assert primary is not None
        assert primary["total_bytes"] > 0
        assert primary["used_bytes"] == primary["total_bytes"] - primary["available_bytes"]

