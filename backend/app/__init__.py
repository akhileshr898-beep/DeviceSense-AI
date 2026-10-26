from flask import Flask, jsonify, request
from flask_cors import CORS
from .config import Config
from .db import init_db
from .routes.metrics import metrics_bp
from .routes.diagnostics import diagnostics_bp
from .routes.actions import actions_bp
from .security.auth import validate_loopback_only


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize CORS restricted to frontend origins
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ALLOWED_ORIGINS")}},
        supports_credentials=True
    )

    # Security check on loopback interface
    @app.before_request
    def check_loopback():
        # Allow test requests without remote_addr
        if request.remote_addr and app.config.get("LOOPBACK_ONLY", True):
            err = validate_loopback_only()
            if err:
                return err

    # Health check endpoint
    @app.route("/api/v1/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "DeviceSense AI Backend",
            "loopback_only": True,
            "version": "1.0.0"
        })

    # Register API Blueprints
    app.register_blueprint(metrics_bp)
    app.register_blueprint(diagnostics_bp)
    app.register_blueprint(actions_bp)

    # Initialize Database Schema
    with app.app_context():
        init_db()

    return app
