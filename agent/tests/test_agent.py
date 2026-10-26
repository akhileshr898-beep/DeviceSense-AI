import pytest
from agent.collectors.cpu_memory import collect_cpu_memory, collect_top_processes
from agent.collectors.disk import collect_disk
from agent.collectors.network import collect_network
from agent.collectors.battery import collect_battery
from agent.transport.client import TransportClient


def test_battery_missing_sensor_does_not_crash():
    bat = collect_battery()
    assert isinstance(bat, dict)
    assert "battery_percent" in bat
    assert "battery_plugged" in bat


def test_cpu_memory_collector():
    metrics = collect_cpu_memory()
    assert isinstance(metrics, dict)
    assert "cpu_percent" in metrics
    assert "memory_percent" in metrics
    assert 0.0 <= metrics["cpu_percent"] <= 100.0
    assert 0.0 <= metrics["memory_percent"] <= 100.0


def test_top_processes_collector():
    procs = collect_top_processes(limit=5)
    assert isinstance(procs, list)
    if procs:
        p = procs[0]
        assert "pid" in p
        assert "name" in p
        assert "cpu_percent" in p


def test_disk_collector():
    disk = collect_disk()
    assert isinstance(disk, dict)
    assert "disk_read_bytes_sec" in disk
    assert "disk_free_bytes" in disk


def test_transport_client_buffer_on_outage():
    client = TransportClient(api_url="http://127.0.0.1:59999/unreachable", token="xyz", max_buffer_size=10)
    sample = {"cpu_percent": 10.0}
    client.queue_sample(sample)
    assert len(client.buffer) == 1

    # Attempt flush against invalid endpoint: should not crash, should return False and keep buffered
    success = client.flush({"id": "test"}, "sess_1")
    assert success is False
    assert len(client.buffer) == 1

