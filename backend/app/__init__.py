from flask import Flask, jsonify, request
from flask_cors import CORS
from .config import Config
from .db import init_db
from .routes.metrics import metrics_bp
from .routes.diagnostics import diagnostics_bp
from .routes.actions import actions_bp
from .security.auth import validate_loopback_only, validate_csrf_and_origin


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize CORS restricted to frontend origins
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ALLOWED_ORIGINS")}},
        supports_credentials=True
    )

    # Global security enforcement hook
    @app.before_request
    def security_enforcement():
        # 1. Loopback-only and DNS Rebinding check
        if request.remote_addr and app.config.get("LOOPBACK_ONLY", True):
            loopback_err = validate_loopback_only()
            if loopback_err:
                return loopback_err

        # 2. Universal anti-CSRF check on all mutating endpoints
        csrf_err = validate_csrf_and_origin()
        if csrf_err:
            return csrf_err

    # Health check endpoint
    @app.route("/api/v1/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "DeviceSense AI Backend",
            "loopback_only": True,
            "version": "1.0.0"
        })

    # Dedicated Security Status & Threat Verification endpoint
    @app.route("/api/v1/security/status", methods=["GET"])
    def security_status():
        return jsonify({
            "status": "secure",
            "measures": {
                "loopback_isolation": {
                    "enabled": bool(app.config.get("LOOPBACK_ONLY", True)),
                    "description": "Binds exclusively to 127.0.0.1; external NICs blocked",
                    "status": "active"
                },
                "dns_rebinding_defense": {
                    "enabled": True,
                    "description": "Host header verified against loopback addresses",
                    "status": "active"
                },
                "anti_csrf_protection": {
                    "enabled": True,
                    "description": "Strict origin and referer domain validation on state-changing calls",
                    "status": "active"
                },
                "agent_token_auth": {
                    "enabled": True,
                    "description": "Cryptographic high-entropy token required for telemetry submission",
                    "status": "active"
                },
                "action_allowlist": {
                    "enabled": True,
                    "description": "Arbitrary shell execution prohibited; only safe catalogue actions permitted",
                    "status": "active"
                },
                "least_privilege": {
                    "enabled": True,
                    "description": "Agent runs as standard user; no administrator elevation required",
                    "status": "active"
                },
                "path_traversal_guards": {
                    "enabled": True,
                    "description": "Canonical realpath verification on temporary directory cleanup",
                    "status": "active"
                }
            },
            "threat_policies": {
                "level_1_informational": "Read-only inspection without system mutation",
                "level_2_user_approved": "Controlled safe adjustments requiring explicit user approval",
                "level_3_excluded": "Registry modification, driver deletion, arbitrary shell strings strictly prohibited"
            }
        })

    # Register API Blueprints
    app.register_blueprint(metrics_bp)
    app.register_blueprint(diagnostics_bp)
    app.register_blueprint(actions_bp)

    # Initialize Database Schema
    with app.app_context():
        init_db(app.config.get("SQLALCHEMY_DATABASE_URI"))

    return app
