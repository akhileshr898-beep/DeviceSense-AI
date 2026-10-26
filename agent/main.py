import argparse
from datetime import datetime, timezone
import os
import signal
import sys
import time
from config import AgentConfig
from collectors.cpu_memory import prime_cpu, collect_cpu_memory, collect_top_processes
from collectors.disk import collect_disk
from collectors.network import collect_network
from collectors.battery import collect_battery
from transport.client import TransportClient

_running = True
_paused = False


def sig_handler(signum, frame):
    global _running
    print("\n[DeviceSense Agent] Shutdown signal received. Exiting gracefully...")
    _running = False


signal.signal(signal.SIGINT, sig_handler)
signal.signal(signal.SIGTERM, sig_handler)


def build_sample():
    """Aggregates metrics from all modular collectors into a single timestamped dict."""
    cpu_mem = collect_cpu_memory()
    disk = collect_disk()
    net = collect_network()
    bat = collect_battery()
    procs = collect_top_processes(limit=8)

    sample = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **cpu_mem,
        **disk,
        **net,
        **bat,
        "top_processes": procs,
    }
    return sample


def run_agent(interval=None, single_run=False):
    global _running, _paused

    sample_interval = interval or AgentConfig.CORE_METRIC_INTERVAL
    print("==================================================")
    print(" DeviceSense AI - Local Windows Monitoring Agent")
    print(f" Host:     {AgentConfig.HOSTNAME}")
    print(f" OS:       {AgentConfig.OS_VERSION}")
    print(f" Target:   {AgentConfig.API_URL}")
    print(f" Interval: {sample_interval}s")
    print("==================================================")

    prime_cpu()
    time.sleep(0.5)

    client = TransportClient(api_url=AgentConfig.API_URL, token=AgentConfig.AGENT_TOKEN)
    device_meta = {
        "id": AgentConfig.DEVICE_ID,
        "hostname": AgentConfig.HOSTNAME,
        "os_version": AgentConfig.OS_VERSION,
        "cpu_cores": os.cpu_count() or 4,
    }
    session_id = f"sess_{int(time.time())}"

    while _running:
        if not _paused:
            try:
                sample = build_sample()
                client.queue_sample(sample)
                success = client.flush(device_meta, session_id)

                status_mark = "OK" if success else "BUFFERED"
                print(
                    f"[{sample['timestamp'][11:19]}] CPU: {sample['cpu_percent']:>4.1f}% | "
                    f"RAM: {sample['memory_percent']:>4.1f}% | "
                    f"Disk: {sample['disk_percent']:>4.1f}% | "
                    f"Net: {sample['net_bytes_recv_sec']/1024:>5.1f}KB/s | "
                    f"Ping: {sample['net_latency_ms']:>4.0f}ms -> [{status_mark}]"
                )
            except Exception as e:
                print(f"[Agent Collector Error] {e}")

        if single_run:
            break

        time.sleep(sample_interval)

    print("[DeviceSense Agent] Stopped cleanly.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DeviceSense AI Local Monitoring Agent")
    parser.add_argument("--interval", type=float, default=2.0, help="Sampling interval in seconds")
    parser.add_argument("--single-run", action="store_true", help="Collect one sample and exit")
    args = parser.parse_args()

    run_agent(interval=args.interval, single_run=args.single_run)
