import sys
from pathlib import Path

# Ensure backend directory is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app import create_app
from app.config import Config

app = create_app()

if __name__ == "__main__":
    print(f"==================================================")
    print(f" DeviceSense AI Local Diagnostic Backend")
    print(f" Binding: http://{Config.HOST}:{Config.PORT}")
    print(f" Local Loopback Only: {Config.LOOPBACK_ONLY}")
    print(f" Agent Auth Token: {Config.AGENT_AUTH_TOKEN}")
    print(f"==================================================")
    
    # Strictly bind to 127.0.0.1, never 0.0.0.0
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG,
        threaded=True
    )

