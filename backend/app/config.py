import os
import secrets
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Generate or load persistent agent auth token
TOKEN_FILE = DATA_DIR / ".agent_token"
if TOKEN_FILE.exists():
    DEFAULT_AGENT_TOKEN = TOKEN_FILE.read_text(encoding="utf-8").strip()
else:
    DEFAULT_AGENT_TOKEN = secrets.token_hex(24)
    TOKEN_FILE.write_text(DEFAULT_AGENT_TOKEN, encoding="utf-8")


class Config:
    HOST = os.environ.get("DEVICESENSE_HOST", "127.0.0.1")
    PORT = int(os.environ.get("DEVICESENSE_PORT", 5000))
    DEBUG = os.environ.get("FLASK_ENV") == "development"
    
    # Strictly loopback binding verification
    LOOPBACK_ONLY = True
    
    # SQLite Database URI
    DB_PATH = DATA_DIR / "devicesense.db"
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{DB_PATH.as_posix()}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Security
    AGENT_AUTH_TOKEN = os.environ.get("DEVICESENSE_AGENT_TOKEN", DEFAULT_AGENT_TOKEN)
    SECRET_KEY = os.environ.get("SECRET_KEY", secrets.token_hex(32))
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5000",
        "http://127.0.0.1:5000"
    ]

    # Retention
    METRIC_RETENTION_DAYS = int(os.environ.get("METRIC_RETENTION_DAYS", 7))
    SUMMARY_RETENTION_DAYS = int(os.environ.get("SUMMARY_RETENTION_DAYS", 30))

    # Diagnostic Rule Thresholds
    THRESHOLDS = {
        "cpu_sustained_percent": 88.0,
        "cpu_sustained_samples": 3,
        "memory_sustained_percent": 88.0,
        "memory_low_avail_mb": 1500,  # under 1.5GB available
        "memory_sustained_samples": 3,
        "disk_free_min_gb": 10.0,
        "disk_busy_sustained_mbps": 40.0,
        "net_latency_max_ms": 160.0,
        "net_packet_loss_max_pct": 5.0,
        "battery_low_percent": 20.0
    }
