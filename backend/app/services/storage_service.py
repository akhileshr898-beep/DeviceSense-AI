import ctypes
import os
import string
import psutil


def get_system_storage():
    """
    Retrieves actual storage information from the operating system across all mounted drives.
    Calculates used storage as (total storage - available storage).
    Calculates storage percentage as ((used storage / total storage) * 100).
    Handles multiple drives with full drive identifiers, labels, and file systems.
    """
    drives = []

    # Method 1: Direct Windows Win32 API via ctypes (zero shell overhead, accurate drive letters & labels)
    if os.name == "nt":
        try:
            bitmask = ctypes.windll.kernel32.GetLogicalDrives()
            for letter in string.ascii_uppercase:
                if bitmask & 1:
                    root = f"{letter}:\\"
                    drive_id = f"{letter}:"
                    dt = ctypes.windll.kernel32.GetDriveTypeW(root)
                    # 2: DRIVE_REMOVABLE, 3: DRIVE_FIXED, 4: DRIVE_REMOTE, 6: DRIVE_RAMDISK
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
                            ctypes.byref(total_free_b)
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

    # Method 2: Cross-platform fallback using psutil.disk_partitions & psutil.disk_usage
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

    primary = None
    if drives:
        for d in drives:
            if d["drive"].upper().startswith("C:") or d["mountpoint"] in ("C:\\", "/"):
                primary = d
                break
        if not primary:
            primary = drives[0]

    if drives:
        agg_total = sum(d["total_bytes"] for d in drives)
        agg_avail = sum(d["available_bytes"] for d in drives)
        agg_used = max(0.0, agg_total - agg_avail)
        agg_pct = round((agg_used / agg_total) * 100.0, 2) if agg_total > 0 else 0.0
        aggregate = {
            "total_bytes": agg_total,
            "available_bytes": agg_avail,
            "used_bytes": agg_used,
            "percent": agg_pct,
            "total_gb": round(agg_total / (1024 ** 3), 1),
            "used_gb": round(agg_used / (1024 ** 3), 1),
            "free_gb": round(agg_avail / (1024 ** 3), 1),
        }
    else:
        aggregate = {
            "total_bytes": 0.0,
            "available_bytes": 0.0,
            "used_bytes": 0.0,
            "percent": 0.0,
            "total_gb": 0.0,
            "used_gb": 0.0,
            "free_gb": 0.0,
        }

    return {
        "drives": drives,
        "primary": primary,
        "aggregate": aggregate,
        "is_available": len(drives) > 0 and primary is not None,
    }

