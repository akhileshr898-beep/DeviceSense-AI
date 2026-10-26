import os
import platform
import socket
from pathlib import Path

# Path to backend token file if present
BACKEND_TOKEN_FILE = (
    Path(__file__).resolve().parent.parent / "backend" / "data" / ".agent_token"
)


def get_token():
    if os.environ.get("DEVICESENSE_AGENT_TOKEN"):
        return os.environ.get("DEVICESENSE_AGENT_TOKEN")
    if BACKEND_TOKEN_FILE.exists():
        try:
            return BACKEND_TOKEN_FILE.read_text(encoding="utf-8").strip()
        except Exception:
            pass
    return "devicesense_secure_token_default"


class AgentConfig:
    API_URL = os.environ.get(
        "DEVICESENSE_API_URL", "http://127.0.0.1:5000/api/v1/metrics/batch"
    )
    AGENT_TOKEN = get_token()

    # Intervals in seconds
    CORE_METRIC_INTERVAL = float(os.environ.get("SAMPLE_INTERVAL", 2.0))
    PROCESS_SAMPLE_INTERVAL = 5.0
    DISK_SPACE_INTERVAL = 30.0
    BATTERY_INTERVAL = 30.0
    NETWORK_PING_INTERVAL = 15.0

    # Device Metadata
    DEVICE_ID = f"{platform.node().lower()}_{platform.machine().lower()}"
    HOSTNAME = platform.node() or socket.gethostname()
    OS_VERSION = f"{platform.system()} {platform.release()} (Build {platform.version()})"

    # Transport & Resilience
    MAX_BUFFER_SIZE = 120  # Store up to 120 samples (~4 mins) during API outage
    INITIAL_BACKOFF = 1.0
    MAX_BACKOFF = 20.0
    REQUEST_TIMEOUT = 5.0

