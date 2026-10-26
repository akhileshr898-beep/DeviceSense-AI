import functools
import hmac
from flask import request, jsonify, current_app


def require_agent_token(f):
    """
    Decorator to authenticate agent requests using X-Agent-Token header or Bearer token.
    Uses constant-time comparison to prevent timing attacks.
    """
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get("X-Agent-Token")
        if not token:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ", 1)[1]

        expected_token = current_app.config.get("AGENT_AUTH_TOKEN")
        if not token or not expected_token or not hmac.compare_digest(token, expected_token):
            return jsonify({
                "error": "Unauthorized",
                "message": "Valid X-Agent-Token or Bearer token required for agent operations."
            }), 401

        return f(*args, **kwargs)
    return decorated_function


def validate_loopback_only():
    """
    Ensures that incoming requests originate from localhost/loopback interfaces.
    """
    remote_addr = request.remote_addr
    allowed_loopbacks = {"127.0.0.1", "::1", "localhost"}
    if remote_addr not in allowed_loopbacks:
        return jsonify({
            "error": "Forbidden",
            "message": "Access restricted to local loopback interface only."
        }), 403
    return None


def validate_csrf_and_origin():
    """
    Validates Origin/Referer for state-changing browser requests (POST, PUT, DELETE).
    Helps protect localhost endpoints against drive-by web requests.
    """
    if request.method in ("POST", "PUT", "DELETE", "PATCH"):
        origin = request.headers.get("Origin") or request.headers.get("Referer")
        # Direct local scripts or agent without Origin might have X-Agent-Token
        if request.headers.get("X-Agent-Token"):
            return None

        if origin:
            allowed_prefixes = (
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5000",
                "http://127.0.0.1:5000"
            )
            if not any(origin.startswith(prefix) for prefix in allowed_prefixes):
                return jsonify({
                    "error": "Forbidden",
                    "message": f"Cross-origin request from '{origin}' is not permitted."
                }), 403

    return None
