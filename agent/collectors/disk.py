import ctypes
import os
import string
import time
import psutil

_last_disk_io = None
_last_disk_time = None
_cached_disk_usage = None
_cached_usage_time = 0.0


def get_system_drives():
    """
    Retrieves actual storage information from the operating system across all mounted drives.
    Calculates used storage as (total storage - available storage).
    Calculates storage percentage as ((used storage / total storage) * 100).
    """
    drives = []

    # Method 1: Direct Windows Win32 API via ctypes
    if os.name == "nt":
        try:
            bitmask = ctypes.windll.kernel32.GetLogicalDrives()
            for letter in string.ascii_uppercase:
                if bitmask & 1:
                    root = f"{letter}:\\"
                    drive_id = f"{letter}:"
                    dt = ctypes.windll.kernel32.GetDriveTypeW(root)
                    if dt in (2, 3, 4, 6):
                        vol_name = ctypes.create_unicode_buffer(260)
                        fs_name = ctypes.create_unicode_buffer(260)
                        ctypes.windll.kernel32.GetVolumeInformationW(
                            root, vol_name, 260, None, None, None, fs_name, 260
                        )
                        free_b = ctypes.c_ulonglong()
                        total_b = ctypes.c_ulonglong()
                        total_free_b = ctypes.c_ulonglong()
                        success = ctypes.windll.kernel32.GetDiskFreeSpaceExW(
                            root,
                            ctypes.byref(free_b),
                            ctypes.byref(total_b),
                            ctypes.byref(total_free_b),
                        )
                        if success and total_b.value > 0:
                            total = float(total_b.value)
                            avail = float(free_b.value)
                            used = max(0.0, total - avail)
                            pct = round((used / total) * 100.0, 2)
                            default_label = "Windows-SSD" if letter == "C" else ("Local Disk" if dt == 3 else "Removable")
                            label = vol_name.value.strip() or default_label
                            drive_type_str = "Fixed" if dt == 3 else ("Removable" if dt == 2 else ("Network" if dt == 4 else "RAMDisk"))
                            drives.append({
                                "drive": drive_id,
                                "mountpoint": root,
                                "label": label,
                                "fs": fs_name.value or "NTFS",
                                "drive_type": drive_type_str,
                                "total_bytes": total,
                                "available_bytes": avail,
                                "used_bytes": used,
                                "percent": pct,
                                "total_gb": round(total / (1024 ** 3), 1),
                                "used_gb": round(used / (1024 ** 3), 1),
                                "free_gb": round(avail / (1024 ** 3), 1),
                            })
                bitmask >>= 1
        except Exception:
            pass

    # Method 2: Cross-platform fallback using psutil
    if not drives:
        try:
            partitions = psutil.disk_partitions(all=False)
            for p in partitions:
                try:
                    usage = psutil.disk_usage(p.mountpoint)
                    if usage.total > 0:
                        total = float(usage.total)
                        avail = float(usage.free)
                        used = max(0.0, total - avail)
                        pct = round((used / total) * 100.0, 2)
                        drives.append({
                            "drive": p.device.rstrip("\\/"),
                            "mountpoint": p.mountpoint,
                            "label": p.device,
                            "fs": p.fstype,
                            "drive_type": "Fixed",
                            "total_bytes": total,
                            "available_bytes": avail,
                            "used_bytes": used,
                            "percent": pct,
                            "total_gb": round(total / (1024 ** 3), 1),
                            "used_gb": round(used / (1024 ** 3), 1),
                            "free_gb": round(avail / (1024 ** 3), 1),
                        })
                except (PermissionError, OSError):
                    continue
        except Exception:
            pass

    return drives


def collect_disk(force_usage=False):
    """
    Collects disk read/write throughput (B/s) and real hardware disk capacity.
    Calculates used storage as (total storage - available storage).
    Calculates storage percentage as ((used storage / total storage) * 100).
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

    # Disk capacity check (cached every 10s or forced)
    if force_usage or _cached_disk_usage is None or (now - _cached_usage_time) > 10.0:
        drives = get_system_drives()
        primary = None
        if drives:
            for d in drives:
                if d["drive"].upper().startswith("C:") or d["mountpoint"] in ("C:\\", "/"):
                    primary = d
                    break
            if not primary:
                primary = drives[0]

        if primary:
            _cached_disk_usage = {
                "disk_free_bytes": float(primary["available_bytes"]),
                "disk_total_bytes": float(primary["total_bytes"]),
                "disk_used_bytes": float(primary["used_bytes"]),
                "disk_percent": float(primary["percent"]),
                "disk_drive": primary["drive"],
                "disk_label": primary["label"],
                "drives": drives,
            }
        else:
            _cached_disk_usage = {
                "disk_free_bytes": 0.0,
                "disk_total_bytes": 0.0,
                "disk_used_bytes": 0.0,
                "disk_percent": 0.0,
                "disk_drive": "C:",
                "disk_label": "Unavailable",
                "drives": [],
            }
        _cached_usage_time = now

    return {
        "disk_read_bytes_sec": read_rate,
        "disk_write_bytes_sec": write_rate,
        **_cached_disk_usage,
    }
