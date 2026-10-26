from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from ..db import SessionLocal
from ..models.database import Diagnostic, Device, MonitoringSession, MetricSample, ActionEvent, Verification

diagnostics_bp = Blueprint("diagnostics", __name__, url_prefix="/api/v1")


@diagnostics_bp.route("/diagnostics", methods=["GET"])
def get_diagnostics():
    """
    Returns list of diagnostics. Supports ?status=active|resolved|all
    """
    status_filter = request.args.get("status", "all")
    db = SessionLocal()
    try:
        query = db.query(Diagnostic)
        if status_filter != "all":
            query = query.filter(Diagnostic.status == status_filter)

        findings = query.order_by(Diagnostic.created_at.desc()).all()
        return jsonify({
            "count": len(findings),
            "diagnostics": [f.to_dict() for f in findings]
        })
    finally:
        db.close()


@diagnostics_bp.route("/diagnostics/<diag_id>", methods=["GET"])
def get_diagnostic_detail(diag_id):
    """
    Returns full details for a single diagnostic finding.
    """
    db = SessionLocal()
    try:
        finding = db.query(Diagnostic).filter(Diagnostic.id == diag_id).first()
        if not finding:
            return jsonify({"error": "Not Found", "message": f"Diagnostic {diag_id} does not exist."}), 404

        return jsonify(finding.to_dict())
    finally:
        db.close()


@diagnostics_bp.route("/diagnostics/<diag_id>/dismiss", methods=["POST"])
def dismiss_diagnostic(diag_id):
    """
    Dismisses an active diagnostic finding.
    """
    db = SessionLocal()
    try:
        finding = db.query(Diagnostic).filter(Diagnostic.id == diag_id).first()
        if not finding:
            return jsonify({"error": "Not Found", "message": f"Diagnostic {diag_id} does not exist."}), 404

        finding.status = "dismissed"
        finding.resolved_at = datetime.now(timezone.utc)
        db.commit()

        return jsonify({"status": "success", "message": f"Diagnostic {diag_id} dismissed."})
    finally:
        db.close()


@diagnostics_bp.route("/reports", methods=["GET"])
def generate_technician_report():
    """
    Generates a structured diagnostic report for technician inspection or export.
    """
    db = SessionLocal()
    try:
        device = db.query(Device).first()
        latest_sample = db.query(MetricSample).order_by(MetricSample.timestamp.desc()).first()
        diagnostics = db.query(Diagnostic).order_by(Diagnostic.created_at.desc()).all()
        actions = db.query(ActionEvent).order_by(ActionEvent.completed_at.desc()).all()

        report = {
            "title": "DeviceSense AI Diagnostic & Performance Audit",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "device": device.to_dict() if device else {"hostname": "Localhost", "os": "Windows"},
            "system_state": latest_sample.to_dict() if latest_sample else None,
            "summary_counts": {
                "total_diagnostics": len(diagnostics),
                "active_warnings": sum(1 for d in diagnostics if d.status == "active" and d.severity == "warning"),
                "active_critical": sum(1 for d in diagnostics if d.status == "active" and d.severity == "critical"),
                "executed_actions": len([a for a in actions if a.status == "completed"]),
            },
            "findings": [d.to_dict() for d in diagnostics],
            "action_history": [a.to_dict() for a in actions],
        }

        # Format markdown version for simple copying
        md_lines = [
            f"# DeviceSense AI Diagnostic Report",
            f"Generated: {report['generated_at']}",
            f"Host: {report['device'].get('hostname')} ({report['device'].get('os_version', 'Windows')})",
            "",
            "## Current Health Status",
            f"- CPU: {report['system_state']['cpu_percent']}%" if report['system_state'] else "- CPU: N/A",
            f"- Memory: {report['system_state']['memory_percent']}% ({(report['system_state'].get('memory_available_bytes') or 0.0) / (1024**3):.1f} GB free)" if report['system_state'] else "- Memory: N/A",
            f"- Disk: {report['system_state']['disk_percent']}% ({(report['system_state'].get('disk_free_bytes') or 0.0) / (1024**3):.1f} GB free)" if report['system_state'] else "- Disk: N/A",
            f"- Network Latency: {report['system_state']['net_latency_ms']} ms" if report['system_state'] else "- Latency: N/A",
            "",
            "## Diagnostic Findings & Evidence",
        ]
        if not diagnostics:
            md_lines.append("No active or historical diagnostic issues identified.")
        else:
            for d in diagnostics:
                d_dict = d.to_dict()
                md_lines.append(f"### [{d.severity.upper()}] {d.summary} ({d.status})")
                md_lines.append(f"- Category: `{d.category}`")
                for ev in d_dict.get("evidence", []):
                    md_lines.append(f"  * Evidence: {ev}")
                for hyp in d_dict.get("hypotheses", []):
                    md_lines.append(f"  * Hypothesis: {hyp.get('cause')} (Confidence: {hyp.get('confidence', 0)*100:.0f}%)")
                md_lines.append("")

        report["markdown"] = "\n".join(md_lines)
        return jsonify(report)
    finally:
        db.close()

