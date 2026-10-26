import psutil


def prime_cpu():
    """Primes the psutil cpu_percent internal counter."""
    try:
        psutil.cpu_percent(interval=None)
    except Exception:
        pass


def collect_cpu_memory():
    """
    Collects system CPU utilization and RAM metrics.
    """
    try:
        cpu_pct = psutil.cpu_percent(interval=None)
    except Exception:
        cpu_pct = 0.0

    try:
        mem = psutil.virtual_memory()
        mem_pct = mem.percent
        mem_avail = mem.available
        mem_total = mem.total
    except Exception:
        mem_pct = 0.0
        mem_avail = 0.0
        mem_total = 0.0

    return {
        "cpu_percent": float(cpu_pct),
        "memory_percent": float(mem_pct),
        "memory_available_bytes": float(mem_avail),
        "memory_total_bytes": float(mem_total),
    }


def collect_top_processes(limit=10):
    """
    Scans processes and returns top resource consumers.
    Gracefully ignores inaccessible system-protected processes.
    """
    processes = []
    for proc in psutil.process_iter(
        ["pid", "name", "cpu_percent", "memory_percent", "memory_info", "status"]
    ):
        try:
            info = proc.info
            # Filter idle system threads with 0 usage
            mem_rss = info["memory_info"].rss if info.get("memory_info") else 0
            processes.append({
                "pid": info["pid"],
                "name": info["name"] or "Unknown",
                "cpu_percent": round(info["cpu_percent"] or 0.0, 1),
                "memory_percent": round(info["memory_percent"] or 0.0, 1),
                "memory_rss_bytes": mem_rss,
                "status": info["status"] or "running"
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
        except Exception:
            continue

    # Sort primarily by CPU and memory
    processes.sort(key=lambda p: (p["cpu_percent"], p["memory_percent"]), reverse=True)
    return processes[:limit]
