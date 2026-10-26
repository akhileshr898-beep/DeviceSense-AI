from datetime import datetime, timezone
import json
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Index
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def utc_now():
    return datetime.now(timezone.utc)


class Device(Base):
    __tablename__ = "device"

    id = Column(String(64), primary_key=True)
    hostname = Column(String(255), nullable=False)
    os_version = Column(String(255), nullable=False)
    cpu_cores = Column(Integer, default=1)
    total_ram_bytes = Column(Integer, default=0)
    created_at = Column(DateTime, default=utc_now)

    sessions = relationship("MonitoringSession", back_populates="device", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "hostname": self.hostname,
            "os_version": self.os_version,
            "cpu_cores": self.cpu_cores,
            "total_ram_bytes": self.total_ram_bytes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class MonitoringSession(Base):
    __tablename__ = "monitoring_session"

    id = Column(String(64), primary_key=True)
    device_id = Column(String(64), ForeignKey("device.id"), nullable=False, index=True)
    started_at = Column(DateTime, default=utc_now, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    status = Column(String(32), default="active")  # active, paused, stopped

    device = relationship("Device", back_populates="sessions")
    metric_samples = relationship("MetricSample", back_populates="session", cascade="all, delete-orphan")
    diagnostics = relationship("Diagnostic", back_populates="session", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "device_id": self.device_id,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "status": self.status,
        }


class MetricSample(Base):
    __tablename__ = "metric_sample"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), ForeignKey("monitoring_session.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=utc_now, nullable=False, index=True)

    # Core System Metrics
    cpu_percent = Column(Float, nullable=False)
    memory_percent = Column(Float, nullable=False)
    memory_available_bytes = Column(Float, default=0.0)
    memory_total_bytes = Column(Float, default=0.0)

    # Disk
    disk_read_bytes_sec = Column(Float, default=0.0)
    disk_write_bytes_sec = Column(Float, default=0.0)
    disk_free_bytes = Column(Float, default=0.0)
    disk_total_bytes = Column(Float, default=0.0)
    disk_percent = Column(Float, default=0.0)

    # Network
    net_bytes_sent_sec = Column(Float, default=0.0)
    net_bytes_recv_sec = Column(Float, default=0.0)
    net_latency_ms = Column(Float, default=0.0)
    net_packet_loss_pct = Column(Float, default=0.0)

    # Battery (Optional on desktop PCs)
    battery_percent = Column(Float, nullable=True)
    battery_plugged = Column(Boolean, nullable=True)

    # Processes & ML Anomaly Score
    top_processes_json = Column(Text, default="[]")
    anomaly_score = Column(Float, default=0.0)
    is_anomaly = Column(Boolean, default=False)

    session = relationship("MonitoringSession", back_populates="metric_samples")

    __table_args__ = (
        Index("idx_metric_sample_session_time", "session_id", "timestamp"),
    )

    def to_dict(self):
        try:
            procs = json.loads(self.top_processes_json) if self.top_processes_json else []
        except Exception:
            procs = []

        return {
            "id": self.id,
            "session_id": self.session_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "cpu_percent": round(self.cpu_percent, 2),
            "memory_percent": round(self.memory_percent, 2),
            "memory_available_bytes": self.memory_available_bytes,
            "memory_total_bytes": self.memory_total_bytes,
            "disk_read_bytes_sec": round(self.disk_read_bytes_sec, 2),
            "disk_write_bytes_sec": round(self.disk_write_bytes_sec, 2),
            "disk_free_bytes": self.disk_free_bytes,
            "disk_total_bytes": self.disk_total_bytes,
            "disk_percent": round(self.disk_percent, 2),
            "net_bytes_sent_sec": round(self.net_bytes_sent_sec, 2),
            "net_bytes_recv_sec": round(self.net_bytes_recv_sec, 2),
            "net_latency_ms": round(self.net_latency_ms, 2),
            "net_packet_loss_pct": round(self.net_packet_loss_pct, 2),
            "battery_percent": self.battery_percent,
            "battery_plugged": self.battery_plugged,
            "anomaly_score": round(self.anomaly_score, 4),
            "is_anomaly": self.is_anomaly,
            "top_processes": procs,
        }


class Diagnostic(Base):
    __tablename__ = "diagnostic"

    id = Column(String(64), primary_key=True)
    session_id = Column(String(64), ForeignKey("monitoring_session.id"), nullable=False, index=True)
    category = Column(String(64), nullable=False)  # sustained_cpu, memory_pressure, disk_bottleneck, network_latency, storage_warning, startup_impact
    severity = Column(String(32), default="warning")  # info, warning, critical
    status = Column(String(32), default="active")  # active, resolved, dismissed
    summary = Column(String(255), nullable=False)
    evidence_json = Column(Text, default="[]")
    hypotheses_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)
    resolved_at = Column(DateTime, nullable=True)

    session = relationship("MonitoringSession", back_populates="diagnostics")
    recommendations = relationship("Recommendation", back_populates="diagnostic", cascade="all, delete-orphan")

    def to_dict(self):
        try:
            evidence = json.loads(self.evidence_json) if self.evidence_json else []
        except Exception:
            evidence = []
        try:
            hypotheses = json.loads(self.hypotheses_json) if self.hypotheses_json else []
        except Exception:
            hypotheses = []

        return {
            "id": self.id,
            "session_id": self.session_id,
            "category": self.category,
            "severity": self.severity,
            "status": self.status,
            "summary": self.summary,
            "evidence": evidence,
            "hypotheses": hypotheses,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "recommendations": [r.to_dict() for r in self.recommendations],
        }


class Recommendation(Base):
    __tablename__ = "recommendation"

    id = Column(String(64), primary_key=True)
    diagnostic_id = Column(String(64), ForeignKey("diagnostic.id"), nullable=False, index=True)
    action_type = Column(String(64), nullable=False)  # e.g., clean_temp_cache, open_startup_settings, review_process_memory, flush_dns
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    risk_level = Column(String(32), default="level_1_informational")  # level_1_informational, level_2_user_approved
    expected_benefit = Column(String(255), default="")
    target_resource = Column(String(255), default="")
    undo_guidance = Column(Text, default="")
    requires_user_approval = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

    diagnostic = relationship("Diagnostic", back_populates="recommendations")
    action_events = relationship("ActionEvent", back_populates="recommendation", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "diagnostic_id": self.diagnostic_id,
            "action_type": self.action_type,
            "title": self.title,
            "description": self.description,
            "risk_level": self.risk_level,
            "expected_benefit": self.expected_benefit,
            "target_resource": self.target_resource,
            "undo_guidance": self.undo_guidance,
            "requires_user_approval": self.requires_user_approval,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "latest_event": self.action_events[-1].to_dict() if self.action_events else None,
        }


class ActionEvent(Base):
    __tablename__ = "action_event"

    id = Column(String(64), primary_key=True)
    recommendation_id = Column(String(64), ForeignKey("recommendation.id"), nullable=False, index=True)
    status = Column(String(32), default="pending")  # pending, approved, rejected, executing, completed, failed
    approved_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    outcome_summary = Column(Text, default="")
    rejection_reason = Column(String(255), default="")

    recommendation = relationship("Recommendation", back_populates="action_events")
    verifications = relationship("Verification", back_populates="action_event", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "recommendation_id": self.recommendation_id,
            "status": self.status,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "outcome_summary": self.outcome_summary,
            "rejection_reason": self.rejection_reason,
            "verifications": [v.to_dict() for v in self.verifications],
        }


class Verification(Base):
    __tablename__ = "verification"

    id = Column(String(64), primary_key=True)
    action_event_id = Column(String(64), ForeignKey("action_event.id"), nullable=False, index=True)
    metric_name = Column(String(64), nullable=False)  # e.g., memory_percent, cpu_percent, disk_free_bytes
    baseline_value = Column(Float, nullable=False)
    measured_value = Column(Float, nullable=False)
    delta_value = Column(Float, nullable=False)
    outcome = Column(String(32), nullable=False)  # improved, unchanged, worsened, inconclusive
    evidence_json = Column(Text, default="{}")
    measured_at = Column(DateTime, default=utc_now, nullable=False)

    action_event = relationship("ActionEvent", back_populates="verifications")

    def to_dict(self):
        try:
            ev = json.loads(self.evidence_json) if self.evidence_json else {}
        except Exception:
            ev = {}

        return {
            "id": self.id,
            "action_event_id": self.action_event_id,
            "metric_name": self.metric_name,
            "baseline_value": round(self.baseline_value, 2),
            "measured_value": round(self.measured_value, 2),
            "delta_value": round(self.delta_value, 2),
            "outcome": self.outcome,
            "evidence": ev,
            "measured_at": self.measured_at.isoformat() if self.measured_at else None,
        }
