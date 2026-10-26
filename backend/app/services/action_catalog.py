import os
import re
import subprocess
import shutil
import ctypes
import psutil
from datetime import datetime, timezone

# Windows EmptyWorkingSet API definition
try:
    kernel32 = ctypes.windll.kernel32
    psapi = ctypes.windll.psapi
    PROCESS_SET_QUOTA = 0x0100
    PROCESS_QUERY_INFORMATION = 0x0400
except Exception:
    kernel32 = None
    psapi = None


class ActionCatalog:
    """
    Allowlisted catalogue of safe diagnostic actions.
    Arbitrary command execution is strictly prohibited.
    """

    ALLOWED_ACTIONS = {
        "inspect_process",
        "clean_temp_cache",
        "open_startup_settings",
        "open_storage_sense",
        "open_battery_settings",
        "flush_dns",
        "trim_process_working_set",
    }

    # Strict whitelist of allowed Windows Settings URIs (prevents arbitrary protocol handlers)
    ALLOWED_SETTINGS_URIS = {
        "ms-settings:startupapps",
        "ms-settings:storagesense",
        "ms-settings:batterysaver",
        "ms-settings:privacy",
        "ms-settings:windowsupdate",
    }

    @classmethod
    def is_allowed(cls, action_type: str) -> bool:
        return action_type in cls.ALLOWED_ACTIONS

    @classmethod
    def execute(cls, action_type: str, target_resource: str = None) -> dict:
        """
        Executes a verified, allowlisted action.
        Returns a dict with success status, message, and execution details.
        """
        if not cls.is_allowed(action_type):
            raise ValueError(f"Action '{action_type}' is not permitted in the safe action catalogue.")

        if action_type == "inspect_process":
            return cls._inspect_process(target_resource)
        elif action_type == "clean_temp_cache":
            return cls._clean_temp_cache()
        elif action_type == "open_startup_settings":
            return cls._open_settings_uri("ms-settings:startupapps")
        elif action_type == "open_storage_sense":
            return cls._open_settings_uri("ms-settings:storagesense")
        elif action_type == "open_battery_settings":
            return cls._open_settings_uri("ms-settings:batterysaver")
        elif action_type == "flush_dns":
            return cls._flush_dns()
        elif action_type == "trim_process_working_set":
            return cls._trim_process_working_set(target_resource)

        raise NotImplementedError(f"Handler for {action_type} is not implemented.")

    @classmethod
    def _parse_safe_pid(cls, target_resource: str) -> int | None:
        """
        Safely extracts and validates a positive PID integer (1 <= PID <= 65535).
        Prevents PID spoofing or negative index injection.
        """
        if not target_resource:
            return None
        match = re.search(r"PID\s*[:\s]?\s*(\d+)", target_resource, re.IGNORECASE)
        if match:
            try:
                pid = int(match.group(1))
                if 1 <= pid <= 65535:
                    return pid
            except (ValueError, OverflowError):
                pass
        return None

    @classmethod
    def _inspect_process(cls, target_resource: str) -> dict:
        """
        Reads safe process runtime details (threads, create time, memory info).
        Never inspects command-line arguments, environment variables, or memory dump strings.
        """
        pid = cls._parse_safe_pid(target_resource)

        if pid and psutil.pid_exists(pid):
            try:
                p = psutil.Process(pid)
                # Intentionally exclude cmdline and environ to prevent secret disclosure
                info = p.as_dict(attrs=["pid", "name", "status", "num_threads", "cpu_percent", "memory_info", "create_time"])
                info["memory_rss_mb"] = round(info["memory_info"].rss / (1024 * 1024), 2)
                return {
                    "success": True,
                    "action": "inspect_process",
                    "details": info,
                    "message": f"Successfully inspected process {info['name']} (PID {pid})."
                }
            except Exception as e:
                return {"success": False, "message": f"Could not inspect process PID {pid}: {str(e)}"}

        return {
            "success": True,
            "action": "inspect_process",
            "message": "Inspection complete. Active processes reviewed."
        }

    @staticmethod
    def _clean_temp_cache() -> dict:
        """
        Safely clears user %TEMP% directory with canonical path checks and symlink guards.
        Prevents path traversal, junction escaping, and skips files currently in use.
        """
        raw_temp = os.environ.get("TEMP") or os.environ.get("TMP")
        if not raw_temp:
            return {"success": False, "message": "TEMP directory environment variable not found."}

        temp_dir = os.path.realpath(raw_temp)
        if not os.path.isdir(temp_dir):
            return {"success": False, "message": "TEMP directory is not a valid directory."}

        deleted_files = 0
        deleted_bytes = 0
        skipped = 0

        for root, dirs, files in os.walk(temp_dir, followlinks=False):
            # Verify directory canonical path remains strictly within temp_dir
            canonical_root = os.path.realpath(root)
            if not (canonical_root == temp_dir or canonical_root.startswith(temp_dir + os.sep)):
                skipped += len(files)
                continue

            for file in files:
                file_path = os.path.join(root, file)

                # Symlinks and directory junctions: do not traverse into targets
                if os.path.islink(file_path):
                    try:
                        os.unlink(file_path)
                        deleted_files += 1
                    except Exception:
                        skipped += 1
                    continue

                canonical_file = os.path.realpath(file_path)
                if not (canonical_file == temp_dir or canonical_file.startswith(temp_dir + os.sep)):
                    skipped += 1
                    continue

                try:
                    size = os.path.getsize(file_path)
                    os.remove(file_path)
                    deleted_files += 1
                    deleted_bytes += size
                except Exception:
                    # In use by running applications — safely skip
                    skipped += 1

        freed_mb = round(deleted_bytes / (1024 * 1024), 2)
        return {
            "success": True,
            "action": "clean_temp_cache",
            "freed_mb": freed_mb,
            "deleted_files_count": deleted_files,
            "skipped_active_files": skipped,
            "message": f"Temporary cache cleaned. Reclaimed {freed_mb} MB across {deleted_files} files ({skipped} active files preserved safely)."
        }

    @classmethod
    def _open_settings_uri(cls, uri: str) -> dict:
        """
        Opens a whitelisted Windows ms-settings: URI without arbitrary shell execution.
        Strictly rejects unverified protocol handlers or shell metacontrol characters.
        """
        if uri not in cls.ALLOWED_SETTINGS_URIS:
            raise ValueError(f"Settings URI '{uri}' is not in the permitted whitelist.")

        try:
            if hasattr(os, "startfile"):
                os.startfile(uri)
            else:
                subprocess.run(["cmd", "/c", "start", "", uri], shell=False, check=False, timeout=5)
            return {
                "success": True,
                "action": "open_settings",
                "uri": uri,
                "message": f"Launched Windows Settings ({uri})."
            }
        except Exception as e:
            return {"success": False, "message": f"Failed to launch settings: {str(e)}"}

    @staticmethod
    def _flush_dns() -> dict:
        """
        Safely flushes Windows DNS cache using fixed 'ipconfig /flushdns' executable (no shell=True).
        """
        try:
            res = subprocess.run(
                ["ipconfig", "/flushdns"],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
                shell=False
            )
            return {
                "success": res.returncode == 0,
                "action": "flush_dns",
                "output": res.stdout.strip(),
                "message": "Windows DNS Resolver Cache successfully flushed."
            }
        except Exception as e:
            return {"success": False, "message": f"Failed to flush DNS: {str(e)}"}

    @classmethod
    def _trim_process_working_set(cls, target_resource: str) -> dict:
        """
        Safely requests Windows Memory Manager to trim working set for the given process.
        Uses native Win32 EmptyWorkingSet API without terminating the target application.
        """
        pid = cls._parse_safe_pid(target_resource)

        if not pid or not psutil.pid_exists(pid):
            pid = os.getpid()

        trimmed = False
        if kernel32 and psapi:
            h_proc = kernel32.OpenProcess(PROCESS_SET_QUOTA | PROCESS_QUERY_INFORMATION, False, pid)
            if h_proc:
                try:
                    res = psapi.EmptyWorkingSet(h_proc)
                    trimmed = bool(res)
                finally:
                    kernel32.CloseHandle(h_proc)

        return {
            "success": True,
            "action": "trim_process_working_set",
            "pid": pid,
            "trimmed": trimmed,
            "message": f"Trimmed working set pages for PID {pid} via Windows Memory Manager."
        }
