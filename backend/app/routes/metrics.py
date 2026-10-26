from datetime import datetime, timezone, timedelta
import json
from flask import Blueprint, request, jsonify, current_app
from ..db import SessionLocal
from ..models.database import Device, MonitoringSession, MetricSample, Diagnostic
from ..security.auth import require_agent_token
from ..services.anomaly_detector import anomaly_detector
from ..services.diagnostic_engine import diagnostic_engine

metrics_bp = Blueprint("metrics", __name__, url_prefix="/api/v1")


@metrics_bp.route("/metrics/batch", methods=["POST"])
@require_agent_token
def receive_metric_batch():
    """
    Ingests authenticated batch of system metric samples submitted by the local agent.
    Validates metrics, computes ML anomaly scores, and triggers rule diagnostics.
    """
    data = request.get_json(silent=True)
    if not data or "samples" not in data:
        return jsonify({"error": "Invalid payload", "message": "Expected 'samples' list in body."}), 400

    samples = data.get("samples", [])
    if not isinstance(samples, list) or len(samples) == 0:
        return jsonify({"error": "Invalid payload", "message": "Samples must be a non-empty list."}), 400

    device_info = data.get("device", {})
    device_id = device_info.get("id", "windows_local_host")
    session_id = data.get("session_id", "default_session")

    db = SessionLocal()
    try:
        # Upsert device record
        dev = db.query(Device).filter(Device.id == device_id).first()
        if not dev:
            dev = Device(
                id=device_id,
                hostname=device_info.get("hostname", "Localhost"),
                os_version=device_info.get("os_version", "Windows 11"),
                cpu_cores=device_info.get("cpu_cores", 4),
                total_ram_bytes=device_info.get("total_ram_bytes", 16 * 1024 * 1024 * 1024)
            )
            db.add(dev)
            db.commit()

        # Upsert session record
        sess = db.query(MonitoringSession).filter(MonitoringSession.id == session_id).first()
        if not sess:
            sess = MonitoringSession(
                id=session_id,
                device_id=device_id,
                started_at=datetime.now(timezone.utc),
                status="active"
            )
            db.add(sess)
            db.commit()

        # Fetch recent samples for rolling window context
        recent_samples = db.query(MetricSample).filter(
            MetricSample.session_id == session_id
        ).order_by(MetricSample.timestamp.desc()).limit(10).all()
        recent_dicts = [s.to_dict() for s in reversed(recent_samples)]

        inserted_count = 0
        newly_diagnosed = []

        for sample in samples:
            # Timestamp parsing
            ts_str = sample.get("timestamp")
            if ts_str:
                try:
                    ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                except Exception:
                    ts = datetime.now(timezone.utc)
            else:
                ts = datetime.now(timezone.utc)

            # ML Anomaly Detection
            norm_score, is_anom = anomaly_detector.score_sample(sample, recent_dicts)

            procs_json = json.dumps(sample.get("top_processes", []))

            metric = MetricSample(
                session_id=session_id,
                timestamp=ts,
                cpu_percent=float(sample.get("cpu_percent", 0.0)),
                memory_percent=float(sample.get("memory_percent", 0.0)),
                memory_available_bytes=float(sample.get("memory_available_bytes", 0.0)),
                memory_total_bytes=float(sample.get("memory_total_bytes", 0.0)),
                disk_read_bytes_sec=float(sample.get("disk_read_bytes_sec", 0.0)),
                disk_write_bytes_sec=float(sample.get("disk_write_bytes_sec", 0.0)),
                disk_free_bytes=float(sample.get("disk_free_bytes", 0.0)),
                disk_total_bytes=float(sample.get("disk_total_bytes", 0.0)),
                disk_percent=float(sample.get("disk_percent", 0.0)),
                net_bytes_sent_sec=float(sample.get("net_bytes_sent_sec", 0.0)),
                net_bytes_recv_sec=float(sample.get("net_bytes_recv_sec", 0.0)),
                net_latency_ms=float(sample.get("net_latency_ms", 0.0)),
                net_packet_loss_pct=float(sample.get("net_packet_loss_pct", 0.0)),
                battery_percent=sample.get("battery_percent"),
                battery_plugged=sample.get("battery_plugged"),
                top_processes_json=procs_json,
                anomaly_score=norm_score,
                is_anomaly=is_anom,
            )
            db.add(metric)
            inserted_count += 1
            recent_dicts.append(sample)

            # Trigger deterministic & evidence-based diagnosis
            new_diags = diagnostic_engine.analyze(sample, recent_dicts, db, session_id)
            if new_diags:
                newly_diagnosed.extend([d.id for d in new_diags])

        db.commit()

        return jsonify({
            "status": "success",
            "inserted_count": inserted_count,
            "new_diagnostics": newly_diagnosed,
            "session_id": session_id
        }), 201

    except Exception as e:
        db.rollback()
        return jsonify({"error": "Failed to process metric batch", "details": str(e)}), 500
    finally:
        db.close()


@metrics_bp.route("/metrics/latest", methods=["GET"])
def get_latest_metrics():
    """
    Returns the most recent single metric sample and active diagnostics count.
    """
    db = SessionLocal()
    try:
        sample = db.query(MetricSample).order_by(MetricSample.timestamp.desc()).first()
        active_diags_count = db.query(Diagnostic).filter(Diagnostic.status == "active").count()

        if not sample:
            return jsonify({
                "sample": None,
                "active_diagnostics_count": active_diags_count,
                "agent_status": "disconnected"
            })

        # Check if sample is recent (within 15 seconds)
        now = datetime.now(timezone.utc)
        sample_time = sample.timestamp.replace(tzinfo=timezone.utc) if sample.timestamp.tzinfo is None else sample.timestamp
        is_fresh = (now - sample_time).total_seconds() < 15

        return jsonify({
            "sample": sample.to_dict(),
            "active_diagnostics_count": active_diags_count,
            "agent_status": "connected" if is_fresh else "stale",
            "timestamp": now.isoformat()
        })
    finally:
        db.close()


@metrics_bp.route("/metrics/history", methods=["GET"])
def get_metrics_history():
    """
    Returns time-series history of metrics for live dashboard charts.
    Accepts limit (default 60) and minutes (default 15).
    """
    limit = min(int(request.args.get("limit", 60)), 300)
    minutes = int(request.args.get("minutes", 15))

    db = SessionLocal()
    try:
        since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        samples = db.query(MetricSample).filter(
            MetricSample.timestamp >= since
        ).order_by(MetricSample.timestamp.asc()).limit(limit).all()

        # If filtered set is empty, return latest N samples
        if not samples:
            samples = db.query(MetricSample).order_by(
                MetricSample.timestamp.desc()
            ).limit(limit).all()
            samples = list(reversed(samples))

        return jsonify({
            "count": len(samples),
            "samples": [s.to_dict() for s in samples]
        })
    finally:
        db.close()


@metrics_bp.route("/processes", methods=["GET"])
def get_latest_processes():
    """
    Returns the latest process breakdown captured by the agent.
    """
    db = SessionLocal()
    try:
        latest = db.query(MetricSample).order_by(MetricSample.timestamp.desc()).first()
        if not latest or not latest.top_processes_json:
            return jsonify({"processes": []})

        procs = json.loads(latest.top_processes_json)
        sort_by = request.args.get("sort_by", "cpu_percent")
        procs.sort(key=lambda p: p.get(sort_by, 0.0), reverse=True)

        return jsonify({
            "timestamp": latest.timestamp.isoformat(),
            "processes": procs
        })
    except Exception as e:
        return jsonify({"processes": [], "error": str(e)})
    finally:
        db.close()


@metrics_bp.route("/simulate", methods=["POST"])
def simulate_diagnostic_scenario():
    """
    Injects a controlled diagnostic workload or synthetic sample for testing/demonstration.
    Scenarios:
      - 'cpu_overload': High sustained CPU load
      - 'memory_pressure': High RAM usage + low available memory
      - 'disk_warning': Low free disk space
      - 'network_spike': High latency and packet loss
      - 'normal': Healthy typical workload
    """
    payload = request.get_json(silent=True) or {}
    scenario = payload.get("scenario", "cpu_overload")
    count = int(payload.get("count", 3))

    db = SessionLocal()
    try:
        session_id = "simulation_session"
        dev = db.query(Device).filter(Device.id == "simulation_host").first()
        if not dev:
            dev = Device(
                id="simulation_host",
                hostname="Demo-Win11-PC",
                os_version="Windows 11 Pro 23H2",
                cpu_cores=8,
                total_ram_bytes=16 * 1024 * 1024 * 1024
            )
            db.add(dev)
            db.commit()

        sess = db.query(MonitoringSession).filter(MonitoringSession.id == session_id).first()
        if not sess:
            sess = MonitoringSession(
                id=session_id,
                device_id="simulation_host",
                started_at=datetime.now(timezone.utc),
                status="active"
            )
            db.add(sess)
            db.commit()

        generated = []
        now = datetime.now(timezone.utc)

        for i in range(count):
            offset_sec = (count - i) * 2
            ts = now - timedelta(seconds=offset_sec)

            if scenario == "cpu_overload":
                sample_data = {
                    "cpu_percent": 94.2 + (i * 0.5),
                    "memory_percent": 62.0,
                    "memory_available_bytes": 6.0 * 1024 * 1024 * 1024,
                    "memory_total_bytes": 16.0 * 1024 * 1024 * 1024,
                    "disk_read_bytes_sec": 4.5 * 1024 * 1024,
                    "disk_write_bytes_sec": 2.1 * 1024 * 1024,
                    "disk_free_bytes": 140.0 * 1024 * 1024 * 1024,
                    "disk_total_bytes": 512.0 * 1024 * 1024 * 1024,
                    "disk_percent": 72.0,
                    "net_bytes_sent_sec": 120 * 1024,
                    "net_bytes_recv_sec": 450 * 1024,
                    "net_latency_ms": 28.0,
                    "net_packet_loss_pct": 0.0,
                    "battery_percent": 85.0,
                    "battery_plugged": True,
                    "top_processes": [
                        {"pid": 4128, "name": "heavy_worker.exe", "cpu_percent": 82.5, "memory_percent": 14.2, "memory_rss_bytes": 2200000000},
                        {"pid": 1042, "name": "browser.exe", "cpu_percent": 8.0, "memory_percent": 18.0, "memory_rss_bytes": 2800000000},
                        {"pid": 789, "name": "system.exe", "cpu_percent": 3.7, "memory_percent": 5.0, "memory_rss_bytes": 800000000}
                    ]
                }
            elif scenario == "memory_pressure":
                sample_data = {
                    "cpu_percent": 24.5,
                    "memory_percent": 93.8,
                    "memory_available_bytes": 980 * 1024 * 1024,  # Under 1GB
                    "memory_total_bytes": 16.0 * 1024 * 1024 * 1024,
                    "disk_read_bytes_sec": 8.5 * 1024 * 1024,
                    "disk_write_bytes_sec": 12.0 * 1024 * 1024,
                    "disk_free_bytes": 120.0 * 1024 * 1024 * 1024,
                    "disk_total_bytes": 512.0 * 1024 * 1024 * 1024,
                    "disk_percent": 76.0,
                    "net_bytes_sent_sec": 80 * 1024,
                    "net_bytes_recv_sec": 210 * 1024,
                    "net_latency_ms": 32.0,
                    "net_packet_loss_pct": 0.0,
                    "battery_percent": 75.0,
                    "battery_plugged": True,
                    "top_processes": [
                        {"pid": 5892, "name": "chrome.exe (32 tabs)", "cpu_percent": 12.0, "memory_percent": 48.5, "memory_rss_bytes": 7800000000},
                        {"pid": 2910, "name": "ide_workspace.exe", "cpu_percent": 6.5, "memory_percent": 26.0, "memory_rss_bytes": 4200000000},
                    ]
                }
            elif scenario == "disk_warning":
                sample_data = {
                    "cpu_percent": 18.0,
                    "memory_percent": 54.0,
                    "memory_available_bytes": 7.5 * 1024 * 1024 * 1024,
                    "memory_total_bytes": 16.0 * 1024 * 1024 * 1024,
                    "disk_read_bytes_sec": 35.0 * 1024 * 1024,
                    "disk_write_bytes_sec": 42.0 * 1024 * 1024,
                    "disk_free_bytes": 6.2 * 1024 * 1024 * 1024,  # Under 10GB
                    "disk_total_bytes": 512.0 * 1024 * 1024 * 1024,
                    "disk_percent": 98.8,
                    "net_bytes_sent_sec": 40 * 1024,
                    "net_bytes_recv_sec": 80 * 1024,
                    "net_latency_ms": 25.0,
                    "net_packet_loss_pct": 0.0,
                    "battery_percent": 90.0,
                    "battery_plugged": True,
                    "top_processes": [
                        {"pid": 3310, "name": "indexer.exe", "cpu_percent": 12.0, "memory_percent": 8.0, "memory_rss_bytes": 1200000000}
                    ]
                }
            elif scenario == "network_spike":
                sample_data = {
                    "cpu_percent": 15.0,
                    "memory_percent": 48.0,
                    "memory_available_bytes": 8.5 * 1024 * 1024 * 1024,
                    "memory_total_bytes": 16.0 * 1024 * 1024 * 1024,
                    "disk_read_bytes_sec": 1.0 * 1024 * 1024,
                    "disk_write_bytes_sec": 1.0 * 1024 * 1024,
                    "disk_free_bytes": 180.0 * 1024 * 1024 * 1024,
                    "disk_total_bytes": 512.0 * 1024 * 1024 * 1024,
                    "disk_percent": 65.0,
                    "net_bytes_sent_sec": 15 * 1024,
                    "net_bytes_recv_sec": 25 * 1024,
                    "net_latency_ms": 285.0,  # High latency
                    "net_packet_loss_pct": 8.5,  # Packet loss
                    "battery_percent": 88.0,
                    "battery_plugged": True,
                    "top_processes": []
                }
            else:  # normal
                sample_data = {
                    "cpu_percent": 14.5,
                    "memory_percent": 52.0,
                    "memory_available_bytes": 7.8 * 1024 * 1024 * 1024,
                    "memory_total_bytes": 16.0 * 1024 * 1024 * 1024,
                    "disk_read_bytes_sec": 0.8 * 1024 * 1024,
                    "disk_write_bytes_sec": 1.2 * 1024 * 1024,
                    "disk_free_bytes": 160.0 * 1024 * 1024 * 1024,
                    "disk_total_bytes": 512.0 * 1024 * 1024 * 1024,
                    "disk_percent": 68.0,
                    "net_bytes_sent_sec": 45 * 1024,
                    "net_bytes_recv_sec": 120 * 1024,
                    "net_latency_ms": 22.0,
                    "net_packet_loss_pct": 0.0,
                    "battery_percent": 95.0,
                    "battery_plugged": True,
                    "top_processes": []
                }

            norm_score, is_anom = anomaly_detector.score_sample(sample_data)
            procs_json = json.dumps(sample_data.get("top_processes", []))

            m = MetricSample(
                session_id=session_id,
                timestamp=ts,
                cpu_percent=sample_data["cpu_percent"],
                memory_percent=sample_data["memory_percent"],
                memory_available_bytes=sample_data["memory_available_bytes"],
                memory_total_bytes=sample_data["memory_total_bytes"],
                disk_read_bytes_sec=sample_data["disk_read_bytes_sec"],
                disk_write_bytes_sec=sample_data["disk_write_bytes_sec"],
                disk_free_bytes=sample_data["disk_free_bytes"],
                disk_total_bytes=sample_data["disk_total_bytes"],
                disk_percent=sample_data["disk_percent"],
                net_bytes_sent_sec=sample_data["net_bytes_sent_sec"],
                net_bytes_recv_sec=sample_data["net_bytes_recv_sec"],
                net_latency_ms=sample_data["net_latency_ms"],
                net_packet_loss_pct=sample_data["net_packet_loss_pct"],
                battery_percent=sample_data["battery_percent"],
                battery_plugged=sample_data["battery_plugged"],
                top_processes_json=procs_json,
                anomaly_score=norm_score,
                is_anomaly=is_anom,
            )
            db.add(m)
            generated.append(sample_data)

            # Analyze and produce findings
            diagnostic_engine.analyze(sample_data, generated, db, session_id)

        db.commit()

        return jsonify({
            "status": "success",
            "message": f"Simulated {count} samples for scenario '{scenario}'.",
            "scenario": scenario
        })
    except Exception as e:
        db.rollback()
        return jsonify({"error": "Simulation error", "details": str(e)}), 500
    finally:
        db.close()
