import uuid
import json
from datetime import datetime, timezone
from ..models.database import Verification, MetricSample, ActionEvent


class VerificationEngine:
    """
    Verification Engine: captures baseline observation, awaits post-action observation,
    evaluates deltas, and classifies outcomes into: improved, unchanged, worsened, or inconclusive.
    """

    METRIC_MAPPING = {
        "clean_temp_cache": ("disk_free_bytes", "higher_is_better"),
        "trim_process_working_set": ("memory_percent", "lower_is_better"),
        "flush_dns": ("net_latency_ms", "lower_is_better"),
        "open_startup_settings": ("memory_percent", "lower_is_better"),
        "open_storage_sense": ("disk_percent", "lower_is_better"),
        "inspect_process": ("cpu_percent", "lower_is_better"),
        "open_battery_settings": ("battery_percent", "higher_is_better"),
    }

    @classmethod
    def capture_baseline(cls, action_type: str, db_session, session_id: str) -> dict:
        """
        Samples the most recent metrics as the baseline window.
        """
        recent = db_session.query(MetricSample).filter(
            MetricSample.session_id == session_id
        ).order_by(MetricSample.timestamp.desc()).limit(3).all()

        if not recent:
            return {"baseline_val": 0.0, "metric_name": "general", "recent_count": 0}

        metric_name, _ = cls.METRIC_MAPPING.get(action_type, ("cpu_percent", "lower_is_better"))
        values = [getattr(s, metric_name, 0.0) or 0.0 for s in recent]
        baseline_val = sum(values) / len(values)

        return {
            "metric_name": metric_name,
            "baseline_val": baseline_val,
            "samples": [s.to_dict() for s in recent]
        }

    @classmethod
    def verify_action(cls, action_event: ActionEvent, baseline_info: dict, db_session, current_sample: dict = None) -> Verification:
        """
        Compares post-action measurements against the baseline and records the verification result.
        """
        rec = action_event.recommendation
        action_type = rec.action_type if rec else "inspect_process"
        metric_name, direction = cls.METRIC_MAPPING.get(action_type, ("cpu_percent", "lower_is_better"))

        baseline_val = baseline_info.get("baseline_val", 0.0)

        # Get latest sample
        if current_sample and metric_name in current_sample:
            measured_val = float(current_sample[metric_name] or 0.0)
        else:
            latest = db_session.query(MetricSample).filter(
                MetricSample.session_id == rec.diagnostic.session_id if (rec and rec.diagnostic) else None
            ).order_by(MetricSample.timestamp.desc()).first()
            measured_val = float(getattr(latest, metric_name, baseline_val) or baseline_val) if latest else baseline_val

        delta = measured_val - baseline_val

        # Classification logic
        outcome = "unchanged"
        threshold = 1.0  # minimal meaningful difference

        if direction == "lower_is_better":
            if delta <= -threshold:
                outcome = "improved"
            elif delta >= threshold:
                outcome = "worsened"
            else:
                outcome = "unchanged"
        elif direction == "higher_is_better":
            if delta >= threshold:
                outcome = "improved"
            elif delta <= -threshold:
                outcome = "worsened"
            else:
                outcome = "unchanged"

        # Special cases (e.g. disk_free_bytes measured in bytes)
        if "bytes" in metric_name:
            mb_delta = delta / (1024 * 1024)
            if mb_delta > 5.0:
                outcome = "improved"
            elif mb_delta < -5.0:
                outcome = "worsened"
            else:
                outcome = "unchanged"

        # Evidence payload
        evidence = {
            "action_type": action_type,
            "direction": direction,
            "metric_name": metric_name,
            "baseline": baseline_val,
            "measured": measured_val,
            "delta": delta,
            "evaluation_note": f"Target metric '{metric_name}' changed by {delta:+.2f} relative to baseline.",
            "caveat": "Verification observed immediate window outcome. Sustained long-term benefit requires continued monitoring."
        }

        verif = Verification(
            id=f"verif_{uuid.uuid4().hex[:12]}",
            action_event_id=action_event.id,
            metric_name=metric_name,
            baseline_value=baseline_val,
            measured_value=measured_val,
            delta_value=delta,
            outcome=outcome,
            evidence_json=json.dumps(evidence),
            measured_at=datetime.now(timezone.utc)
        )
        db_session.add(verif)
        db_session.commit()
        return verif
