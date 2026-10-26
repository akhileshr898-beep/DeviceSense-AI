import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from ..db import SessionLocal
from ..models.database import Recommendation, ActionEvent, Verification, Diagnostic
from ..services.action_catalog import ActionCatalog
from ..services.verification import VerificationEngine
from ..security.auth import validate_csrf_and_origin

actions_bp = Blueprint("actions", __name__, url_prefix="/api/v1")


@actions_bp.route("/actions/catalog", methods=["GET"])
def get_action_catalog():
    """
    Returns catalogue of allowlisted safe diagnostic actions and risk policies.
    """
    return jsonify({
        "allowed_actions": list(ActionCatalog.ALLOWED_ACTIONS),
        "levels": {
            "level_1_informational": "Read-only inspection without state changes.",
            "level_2_user_approved": "Guided settings or controlled safe operations requiring explicit click approval.",
            "level_3_excluded": "Registry modification, driver deletion, arbitrary PowerShell commands (Strictly excluded)."
        }
    })


@actions_bp.route("/actions/<action_id>/approve", methods=["POST"])
def approve_action(action_id):
    """
    Approves and executes a specific recommendation from the allowlist.
    Triggers baseline capture, execution, and verification engine measurement.
    """
    csrf_err = validate_csrf_and_origin()
    if csrf_err:
        return csrf_err

    db = SessionLocal()
    try:
        rec = db.query(Recommendation).filter(Recommendation.id == action_id).first()
        if not rec:
            return jsonify({"error": "Not Found", "message": f"Recommendation {action_id} not found."}), 404

        if not ActionCatalog.is_allowed(rec.action_type):
            return jsonify({
                "error": "Forbidden",
                "message": f"Action type '{rec.action_type}' is not allowlisted."
            }), 403

        # Capture baseline before execution
        session_id = rec.diagnostic.session_id if rec.diagnostic else "default_session"
        baseline = VerificationEngine.capture_baseline(rec.action_type, db, session_id)

        # Create ActionEvent
        event_id = f"evt_{uuid.uuid4().hex[:12]}"
        event = ActionEvent(
            id=event_id,
            recommendation_id=rec.id,
            status="approved",
            approved_at=datetime.now(timezone.utc)
        )
        db.add(event)
        db.commit()

        # Execute safe action
        try:
            result = ActionCatalog.execute(rec.action_type, rec.target_resource)
            event.status = "completed" if result.get("success", False) else "failed"
            event.completed_at = datetime.now(timezone.utc)
            event.outcome_summary = result.get("message", "Action executed.")
            db.commit()
        except Exception as exec_err:
            event.status = "failed"
            event.outcome_summary = f"Execution error: {str(exec_err)}"
            db.commit()
            return jsonify({"error": "Execution failed", "details": str(exec_err)}), 500

        # Perform Verification
        verif = VerificationEngine.verify_action(event, baseline, db)

        # Mark diagnostic as resolved if action succeeded
        if event.status == "completed" and rec.diagnostic:
            rec.diagnostic.status = "resolved"
            rec.diagnostic.resolved_at = datetime.now(timezone.utc)
            db.commit()

        return jsonify({
            "status": "success",
            "action_event": event.to_dict(),
            "verification": verif.to_dict(),
            "message": event.outcome_summary
        })

    except Exception as e:
        db.rollback()
        return jsonify({"error": "Failed to approve action", "details": str(e)}), 500
    finally:
        db.close()


@actions_bp.route("/actions/<action_id>/reject", methods=["POST"])
def reject_action(action_id):
    """
    Rejects a recommendation and records the user audit trail.
    """
    csrf_err = validate_csrf_and_origin()
    if csrf_err:
        return csrf_err

    payload = request.get_json(silent=True) or {}
    reason = payload.get("reason", "Rejected by user")

    db = SessionLocal()
    try:
        rec = db.query(Recommendation).filter(Recommendation.id == action_id).first()
        if not rec:
            return jsonify({"error": "Not Found", "message": f"Recommendation {action_id} not found."}), 404

        event_id = f"evt_{uuid.uuid4().hex[:12]}"
        event = ActionEvent(
            id=event_id,
            recommendation_id=rec.id,
            status="rejected",
            approved_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
            rejection_reason=reason,
            outcome_summary=f"Action rejected by user: {reason}"
        )
        db.add(event)
        db.commit()

        return jsonify({
            "status": "success",
            "action_event": event.to_dict(),
            "message": "Recommendation rejected."
        })
    finally:
        db.close()


@actions_bp.route("/actions/<action_id>/verification", methods=["GET"])
def get_action_verification(action_id):
    """
    Retrieves verification outcomes for a given recommendation.
    """
    db = SessionLocal()
    try:
        events = db.query(ActionEvent).filter(ActionEvent.recommendation_id == action_id).all()
        if not events:
            return jsonify({"error": "Not Found", "message": "No action events for this recommendation."}), 404

        verifications = []
        for evt in events:
            verifs = db.query(Verification).filter(Verification.action_event_id == evt.id).all()
            verifications.extend([v.to_dict() for v in verifs])

        return jsonify({
            "recommendation_id": action_id,
            "verifications": verifications
        })
    finally:
        db.close()


@actions_bp.route("/actions/history", methods=["GET"])
def get_action_history():
    """
    Returns full audit history of all approved, executed, and rejected actions.
    """
    db = SessionLocal()
    try:
        events = db.query(ActionEvent).order_by(ActionEvent.approved_at.desc()).all()
        results = []
        for evt in events:
            d = evt.to_dict()
            if evt.recommendation:
                d["recommendation_title"] = evt.recommendation.title
                d["action_type"] = evt.recommendation.action_type
                d["risk_level"] = evt.recommendation.risk_level
            results.append(d)

        return jsonify({
            "count": len(results),
            "events": results
        })
    finally:
        db.close()
