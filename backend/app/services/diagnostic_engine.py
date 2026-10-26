import uuid
import json
from datetime import datetime, timezone
from ..models.database import Diagnostic, Recommendation, ActionEvent


class DiagnosticEngine:
    """
    Deterministic rule-based and evidence-based diagnostic engine.
    Connects symptoms with plausible causes and supporting evidence.
    """

    def __init__(self, thresholds=None):
        self.thresholds = thresholds or {
            "cpu_sustained_percent": 88.0,
            "cpu_sustained_samples": 3,
            "memory_sustained_percent": 88.0,
            "memory_low_avail_mb": 1500,
            "memory_sustained_samples": 3,
            "disk_free_min_gb": 10.0,
            "disk_busy_sustained_mbps": 40.0,
            "net_latency_max_ms": 160.0,
            "net_packet_loss_max_pct": 5.0,
            "battery_low_percent": 20.0
        }

    def analyze(self, current_sample, recent_samples, db_session, session_id):
        """
        Analyzes recent samples and generates new Diagnostic findings if abnormal
        conditions are detected, avoiding duplicate active alerts.
        """
        samples = recent_samples or [current_sample]
        findings = []

        # 1. Sustained High CPU Utilization
        cpu_samples = [s.get("cpu_percent", 0.0) for s in samples[-4:]]
        high_cpu_count = sum(1 for val in cpu_samples if val >= self.thresholds["cpu_sustained_percent"])
        if len(cpu_samples) >= 3 and high_cpu_count >= self.thresholds["cpu_sustained_samples"]:
            avg_cpu = sum(cpu_samples) / len(cpu_samples)
            top_proc = self._get_top_process(current_sample, key="cpu_percent")
            top_name = top_proc.get("name", "Unknown") if top_proc else "Active processes"
            top_usage = top_proc.get("cpu_percent", 0) if top_proc else avg_cpu

            finding_data = {
                "category": "sustained_cpu",
                "severity": "critical" if avg_cpu > 95.0 else "warning",
                "summary": f"Sustained high CPU utilization ({avg_cpu:.1f}%) detected",
                "evidence": [
                    f"CPU stayed above {self.thresholds['cpu_sustained_percent']}% for {high_cpu_count} consecutive measurement cycles",
                    f"Average CPU load measured {avg_cpu:.1f}%",
                    f"Leading CPU consumer: '{top_name}' consuming ~{top_usage:.1f}% CPU"
                ],
                "hypotheses": [
                    {"cause": f"Heavy computation or background thread in '{top_name}'", "confidence": 0.85},
                    {"cause": "Unresponsive thread or runaway loop requiring intervention", "confidence": 0.62}
                ],
                "recommended_actions": [
                    {
                        "action_type": "inspect_process",
                        "title": f"Inspect Resource-Heavy Process ({top_name})",
                        "description": f"Examine details, threads and resource breakdown for PID {top_proc.get('pid', 'N/A')} ({top_name}) without terminating it.",
                        "risk_level": "level_1_informational",
                        "expected_benefit": "Identify specific thread activity and confirm whether the process is working normally.",
                        "target_resource": f"PID {top_proc.get('pid', 'N/A')}: {top_name}",
                        "undo_guidance": "No system changes are made; this is a read-only inspection."
                    }
                ]
            }
            findings.append(finding_data)

        # 2. High Memory Pressure
        mem_samples = [s.get("memory_percent", 0.0) for s in samples[-4:]]
        high_mem_count = sum(1 for val in mem_samples if val >= self.thresholds["memory_sustained_percent"])
        avail_mb = current_sample.get("memory_available_bytes", 0.0) / (1024 * 1024)
        if len(mem_samples) >= 3 and high_mem_count >= self.thresholds["memory_sustained_samples"] and avail_mb < self.thresholds["memory_low_avail_mb"]:
            avg_mem = sum(mem_samples) / len(mem_samples)
            top_proc = self._get_top_process(current_sample, key="memory_percent")
            top_name = top_proc.get("name", "Unknown") if top_proc else "Active applications"
            top_mem_mb = (top_proc.get("memory_rss_bytes", 0) / (1024 * 1024)) if top_proc else 0

            finding_data = {
                "category": "memory_pressure",
                "severity": "critical" if avg_mem > 95.0 else "warning",
                "summary": f"High memory pressure ({avg_mem:.1f}% used, only {avail_mb:.0f} MB available)",
                "evidence": [
                    f"System RAM exceeded {self.thresholds['memory_sustained_percent']}% over {high_mem_count} consecutive samples",
                    f"Available uncommitted physical memory dropped to {avail_mb:.0f} MB",
                    f"Highest memory process: '{top_name}' holding {top_mem_mb:.0f} MB"
                ],
                "hypotheses": [
                    {"cause": f"High working set allocation in '{top_name}'", "confidence": 0.82},
                    {"cause": "Accumulated memory pressure from multiple browser tabs or development tools", "confidence": 0.74}
                ],
                "recommended_actions": [
                    {
                        "action_type": "trim_process_working_set",
                        "title": f"Safely Trim Working Set for {top_name}",
                        "description": f"Request Windows Memory Manager to flush inactive cached pages for PID {top_proc.get('pid', 'N/A')} ({top_name}).",
                        "risk_level": "level_2_user_approved",
                        "expected_benefit": f"Free up unreferenced memory without closing {top_name}.",
                        "target_resource": f"PID {top_proc.get('pid', 'N/A')}: {top_name}",
                        "undo_guidance": "Working set pages are paged back into RAM on demand when the app requests them."
                    },
                    {
                        "action_type": "open_startup_settings",
                        "title": "Review Startup Apps in Windows Settings",
                        "description": "Open Windows Startup settings to disable auto-starting background apps that waste memory.",
                        "risk_level": "level_2_user_approved",
                        "expected_benefit": "Prevent unneeded services from consuming memory at boot.",
                        "target_resource": "Windows Startup Apps Configuration",
                        "undo_guidance": "Startup toggles can be switched back on in Settings at any time."
                    }
                ]
            }
            findings.append(finding_data)

        # 3. Low Free Disk Space or High Disk Activity
        disk_free_gb = current_sample.get("disk_free_bytes", 0.0) / (1024 * 1024 * 1024)
        disk_pct = current_sample.get("disk_percent", 0.0)
        if disk_free_gb > 0 and (disk_free_gb < self.thresholds["disk_free_min_gb"] or disk_pct >= 92.0):
            finding_data = {
                "category": "storage_warning",
                "severity": "critical" if disk_free_gb < 5.0 else "warning",
                "summary": f"System drive storage capacity critically low ({disk_free_gb:.1f} GB free, {disk_pct:.1f}% used)",
                "evidence": [
                    f"Free space on primary disk is {disk_free_gb:.1f} GB (minimum recommended is {self.thresholds['disk_free_min_gb']} GB)",
                    f"Disk volume utilization is {disk_pct:.1f}%"
                ],
                "hypotheses": [
                    {"cause": "Accumulated temporary files, system update caches, and recycle bin items", "confidence": 0.88},
                    {"cause": "Large downloads, application caches, or virtual memory swap growth", "confidence": 0.72}
                ],
                "recommended_actions": [
                    {
                        "action_type": "clean_temp_cache",
                        "title": "Safely Clean Windows User Temporary Cache",
                        "description": "Removes stale temporary files from user %TEMP% directory that are not locked by active processes.",
                        "risk_level": "level_2_user_approved",
                        "expected_benefit": "Reclaim disk space without touching user personal documents or applications.",
                        "target_resource": "User %TEMP% Directory",
                        "undo_guidance": "Temporary cache files cannot be restored, but active files are skipped safely."
                    },
                    {
                        "action_type": "open_storage_sense",
                        "title": "Launch Windows Storage Sense",
                        "description": "Opens Windows Storage settings to review large files, unused apps, and system clean-up recommendations.",
                        "risk_level": "level_2_user_approved",
                        "expected_benefit": "Review categorized space usage in native Windows settings.",
                        "target_resource": "Windows Settings: Storage Sense",
                        "undo_guidance": "View-only trigger into native Windows settings."
                    }
                ]
            }
            findings.append(finding_data)

        # 4. High Network Latency or Packet Loss
        net_latency = current_sample.get("net_latency_ms", 0.0)
        net_loss = current_sample.get("net_packet_loss_pct", 0.0)
        if (net_latency > self.thresholds["net_latency_max_ms"] and net_latency < 999) or (net_loss >= self.thresholds["net_packet_loss_max_pct"]):
            finding_data = {
                "category": "network_latency",
                "severity": "warning",
                "summary": f"Degraded network connectivity (latency: {net_latency:.0f} ms, loss: {net_loss:.1f}%)",
                "evidence": [
                    f"Measured round-trip latency to gateway/DNS was {net_latency:.1f} ms (expected < 100 ms)",
                    f"Packet loss rate was {net_loss:.1f}%"
                ],
                "hypotheses": [
                    {"cause": "DNS resolver latency or stale DNS resolver cache", "confidence": 0.76},
                    {"cause": "Wi-Fi channel congestion or active background bandwidth saturation", "confidence": 0.68}
                ],
                "recommended_actions": [
                    {
                        "action_type": "flush_dns",
                        "title": "Flush Windows DNS Resolver Cache",
                        "description": "Executes 'ipconfig /flushdns' to clear outdated or unresponsive DNS lookups safely.",
                        "risk_level": "level_2_user_approved",
                        "expected_benefit": "Forces fresh name resolution and resolves stuck or slow DNS lookups.",
                        "target_resource": "Windows DNS Client Cache",
                        "undo_guidance": "DNS cache automatically rebuilds on the next outbound web requests."
                    }
                ]
            }
            findings.append(finding_data)

        # 5. Low Battery Discharging
        bat_pct = current_sample.get("battery_percent")
        bat_plugged = current_sample.get("battery_plugged")
        if bat_pct is not None and not bat_plugged and bat_pct <= self.thresholds["battery_low_percent"]:
            finding_data = {
                "category": "battery_drain",
                "severity": "warning",
                "summary": f"Battery level is low ({bat_pct:.0f}%) and discharging",
                "evidence": [
                    f"Battery is unplugged and at {bat_pct:.0f}% capacity (warning threshold: {self.thresholds['battery_low_percent']}%)"
                ],
                "hypotheses": [
                    {"cause": "System running on battery power without active AC supply", "confidence": 0.95}
                ],
                "recommended_actions": [
                    {
                        "action_type": "open_battery_settings",
                        "title": "Open Windows Power & Battery Settings",
                        "description": "Opens Windows Power & Battery settings to enable Battery Saver mode or adjust sleep timings.",
                        "risk_level": "level_2_user_approved",
                        "expected_benefit": "Reduce background hardware power consumption.",
                        "target_resource": "Windows Power & Battery Settings",
                        "undo_guidance": "Adjustable in Windows Settings anytime."
                    }
                ]
            }
            findings.append(finding_data)

        # Persist findings to database avoiding spamming duplicates
        persisted = []
        for f in findings:
            created = self._persist_finding_if_new(f, session_id, db_session)
            if created:
                persisted.append(created)

        return persisted

    def _get_top_process(self, sample, key="cpu_percent"):
        procs = sample.get("top_processes", [])
        if not procs:
            return None
        return max(procs, key=lambda p: p.get(key, 0.0), default=None)

    def _persist_finding_if_new(self, finding_data, session_id, db_session):
        # Check if an active diagnostic already exists in the same category
        existing = db_session.query(Diagnostic).filter(
            Diagnostic.session_id == session_id,
            Diagnostic.category == finding_data["category"],
            Diagnostic.status == "active"
        ).first()

        if existing:
            # Update evidence if needed, but do not create duplicate card
            existing.evidence_json = json.dumps(finding_data["evidence"])
            existing.summary = finding_data["summary"]
            db_session.commit()
            return existing

        diag_id = f"diag_{uuid.uuid4().hex[:12]}"
        diag = Diagnostic(
            id=diag_id,
            session_id=session_id,
            category=finding_data["category"],
            severity=finding_data["severity"],
            status="active",
            summary=finding_data["summary"],
            evidence_json=json.dumps(finding_data["evidence"]),
            hypotheses_json=json.dumps(finding_data["hypotheses"]),
        )
        db_session.add(diag)
        db_session.flush()

        # Add recommendations
        for act in finding_data.get("recommended_actions", []):
            rec_id = f"rec_{uuid.uuid4().hex[:12]}"
            rec = Recommendation(
                id=rec_id,
                diagnostic_id=diag_id,
                action_type=act["action_type"],
                title=act["title"],
                description=act["description"],
                risk_level=act["risk_level"],
                expected_benefit=act.get("expected_benefit", ""),
                target_resource=act.get("target_resource", ""),
                undo_guidance=act.get("undo_guidance", ""),
                requires_user_approval=True
            )
            db_session.add(rec)

        db_session.commit()
        return diag


diagnostic_engine = DiagnosticEngine()
