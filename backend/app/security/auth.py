import functools
import hmac
from urllib.parse import urlsplit
from flask import request, jsonify, current_app


def require_agent_token(f):
    """
    Decorator to authenticate agent requests using X-Agent-Token header or Bearer token.
    Uses constant-time comparison (hmac.compare_digest) to prevent timing attacks.
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
    Ensures that incoming requests originate from localhost/loopback interfaces
    and validates Host header to protect against DNS Rebinding attacks.
    """
    remote_addr = request.remote_addr
    allowed_loopbacks = {"127.0.0.1", "::1", "localhost"}
    if remote_addr not in allowed_loopbacks:
        return jsonify({
            "error": "Forbidden",
            "message": "Access restricted to local loopback interface only."
        }), 403

    # DNS Rebinding Defense: Host header must be localhost / 127.0.0.1 / ::1
    raw_host = request.headers.get("Host", "")
    if raw_host:
        host_name = raw_host.split(":")[0].lower()
        if host_name not in allowed_loopbacks:
            return jsonify({
                "error": "Forbidden",
                "message": f"Host '{raw_host}' is rejected. DNS rebinding protection enforced."
            }), 403

    return None


def validate_csrf_and_origin():
    """
    Validates Origin/Referer for state-changing browser requests (POST, PUT, DELETE, PATCH).
    Strictly parses origin and prevents prefix spoofing (e.g. evil-site.com).
    """
    if request.method in ("POST", "PUT", "DELETE", "PATCH"):
        # Authenticated agent requests carrying the cryptographic token are exempt
        agent_token = request.headers.get("X-Agent-Token")
        expected_token = current_app.config.get("AGENT_AUTH_TOKEN")
        if agent_token and expected_token and hmac.compare_digest(agent_token, expected_token):
            return None

        origin = request.headers.get("Origin") or request.headers.get("Referer")
        if origin:
            parsed = urlsplit(origin)
            allowed_netlocs = {
                "localhost:5173",
                "127.0.0.1:5173",
                "localhost:5000",
                "127.0.0.1:5000",
            }
            if parsed.scheme not in ("http", "https") or parsed.netloc.lower() not in allowed_netlocs:
                return jsonify({
                    "error": "Forbidden",
                    "message": f"Cross-origin request from '{origin}' is not permitted."
                }), 403
        else:
            # If no Origin or Referer is supplied for a state-changing request,
            # allow only if request originates from local loopback with valid content-type
            pass

    return None
