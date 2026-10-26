import socket
import time
import psutil

_last_net_io = None
_last_net_time = None
_cached_net_probe = {"net_latency_ms": 25.0, "net_packet_loss_pct": 0.0}
_last_probe_time = 0.0


def check_latency(targets=(("1.1.1.1", 443), ("8.8.8.8", 443), ("8.8.8.8", 53)), timeout=1.2):
    """
    Measures round-trip TCP connection latency in milliseconds.
    Safe, non-privileged alternative to raw ICMP sockets.
    Tries resilient fallback targets across standard ports.
    """
    for host, port in targets:
        start = time.perf_counter()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        try:
            sock.connect((host, port))
            latency = (time.perf_counter() - start) * 1000.0
            return round(latency, 1), 0.0
        except (socket.timeout, socket.error):
            continue
        finally:
            try:
                sock.close()
            except Exception:
                pass
    return 999.0, 100.0


def collect_network():
    """
    Collects network bandwidth deltas and connection latency.
    """
    global _last_net_io, _last_net_time, _cached_net_probe, _last_probe_time

    now = time.time()
    sent_rate = 0.0
    recv_rate = 0.0

    try:
        current_io = psutil.net_io_counters()
        if current_io and _last_net_io and _last_net_time:
            dt = max(now - _last_net_time, 0.001)
            sent_delta = max(current_io.bytes_sent - _last_net_io.bytes_sent, 0)
            recv_delta = max(current_io.bytes_recv - _last_net_io.bytes_recv, 0)
            sent_rate = sent_delta / dt
            recv_rate = recv_delta / dt
        _last_net_io = current_io
        _last_net_time = now
    except Exception:
        pass

    # Latency check probed every 15s to minimize overhead
    if (now - _last_probe_time) > 15.0:
        latency_ms, loss_pct = check_latency()
        _cached_net_probe = {
            "net_latency_ms": latency_ms,
            "net_packet_loss_pct": loss_pct,
        }
        _last_probe_time = now

    return {
        "net_bytes_sent_sec": sent_rate,
        "net_bytes_recv_sec": recv_rate,
        **_cached_net_probe,
    }

