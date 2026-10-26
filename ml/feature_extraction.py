import numpy as np


class FeatureExtractor:
    """
    Extracts rolling-window feature vectors from system metric streams.
    Features:
      1. CPU mean over rolling window
      2. CPU max over rolling window
      3. Current Memory percentage
      4. Disk I/O throughput (MB/s)
      5. Network I/O throughput (MB/s)
      6. Network latency (ms)
      7. Active process count
    """

    FEATURE_NAMES = [
        "cpu_mean",
        "cpu_max",
        "memory_percent",
        "disk_io_mbps",
        "net_io_mbps",
        "net_latency_ms",
        "process_count",
    ]

    @classmethod
    def extract_from_window(cls, sample, window_history=None):
        history = (window_history or []) + [sample]
        cpu_vals = [s.get("cpu_percent", 0.0) for s in history[-5:]]
        cpu_mean = float(np.mean(cpu_vals))
        cpu_max = float(np.max(cpu_vals))

        mem_pct = float(sample.get("memory_percent", 0.0))

        disk_read = sample.get("disk_read_bytes_sec", 0.0)
        disk_write = sample.get("disk_write_bytes_sec", 0.0)
        disk_mbps = (disk_read + disk_write) / (1024 * 1024)

        net_sent = sample.get("net_bytes_sent_sec", 0.0)
        net_recv = sample.get("net_bytes_recv_sec", 0.0)
        net_mbps = (net_sent + net_recv) / (1024 * 1024)

        latency = float(sample.get("net_latency_ms", 25.0))

        procs = sample.get("top_processes", [])
        proc_count = float(len(procs)) if procs else 100.0

        return np.array([
            cpu_mean,
            cpu_max,
            mem_pct,
            disk_mbps,
            net_mbps,
            latency,
            proc_count
        ], dtype=np.float32)
