import os
import time
import psutil

_last_disk_io = None
_last_disk_time = None
_cached_disk_usage = None
_cached_usage_time = 0.0


def collect_disk(force_usage=False):
    """
    Collects disk read/write throughput (B/s) and disk capacity.
    """
    global _last_disk_io, _last_disk_time, _cached_disk_usage, _cached_usage_time

    now = time.time()
    read_rate = 0.0
    write_rate = 0.0

    try:
        current_io = psutil.disk_io_counters()
        if current_io and _last_disk_io and _last_disk_time:
            dt = max(now - _last_disk_time, 0.001)
            read_delta = max(current_io.read_bytes - _last_disk_io.read_bytes, 0)
            write_delta = max(current_io.write_bytes - _last_disk_io.write_bytes, 0)
            read_rate = read_delta / dt
            write_rate = write_delta / dt
        _last_disk_io = current_io
        _last_disk_time = now
    except Exception:
        pass

    # Disk capacity check (cached every 30s)
    if force_usage or _cached_disk_usage is None or (now - _cached_usage_time) > 30.0:
        drive = "C:\\" if os.name == "nt" else "/"
        try:
            usage = psutil.disk_usage(drive)
            _cached_disk_usage = {
                "disk_free_bytes": float(usage.free),
                "disk_total_bytes": float(usage.total),
                "disk_percent": float(usage.percent),
            }
            _cached_usage_time = now
        except Exception:
            _cached_disk_usage = {
                "disk_free_bytes": 0.0,
                "disk_total_bytes": 0.0,
                "disk_percent": 0.0,
            }

    return {
        "disk_read_bytes_sec": read_rate,
        "disk_write_bytes_sec": write_rate,
        **_cached_disk_usage,
    }
