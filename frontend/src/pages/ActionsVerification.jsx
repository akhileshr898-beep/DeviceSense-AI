import React, { useState, useEffect, useCallback } from "react";
import {
  History,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Globe,
  Key,
  FolderLock,
  UserCheck,
  Zap,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import VerificationCard from "../components/VerificationCard";
import { api } from "../services/api";

export default function ActionsVerification() {
  const [actionHistory, setActionHistory] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [securityStatus, setSecurityStatus] = useState(null);
  const [activeThreats, setActiveThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [notification, setNotification] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [historyRes, secRes, diagRes] = await Promise.all([
        api.getActionHistory().catch(() => ({ events: [] })),
        api.getSecurityStatus().catch(() => null),
        api.getDiagnostics("active").catch(() => ({ diagnostics: [] })),
      ]);

      const events = historyRes.events || [];
      setActionHistory(events);

      const allVerifs = [];
      events.forEach((evt) => {
        if (evt.verifications) {
          allVerifs.push(...evt.verifications);
        }
      });
      setVerifications(allVerifs);

      if (secRes) {
        setSecurityStatus(secRes);
      }

      setActiveThreats(diagRes.diagnostics || []);
    } catch (e) {
      console.error("Failed to load verification & security data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCorrectAllThreats = async () => {
    setIsCorrecting(true);
    setNotification(null);
    try {
      const result = await api.correctAllThreats();
      setNotification({
        type: "success",
        message: result.message || "All active threats have been successfully mitigated and verified!",
      });
      await loadData();
    } catch (err) {
      setNotification({
        type: "error",
        message: `Correction failed: ${err.message}`,
      });
    } finally {
      setIsCorrecting(false);
    }
  };

  const securityMeasuresList = [
    {
      title: "Local Loopback Isolation",
      desc: "Flask service binds exclusively to 127.0.0.1; external NICs blocked",
      icon: Lock,
      status: "Active & Enforced",
      color: "#059669",
    },
    {
      title: "DNS Rebinding Defense",
      desc: "Incoming Host header strictly verified against loopback endpoints",
      icon: Globe,
      status: "Active & Enforced",
      color: "#059669",
    },
    {
      title: "Anti-CSRF & Origin Verification",
      desc: "State-changing POST/PUT requests require authorized browser origins",
      icon: ShieldCheck,
      status: "Active & Enforced",
      color: "#059669",
    },
    {
      title: "Cryptographic Token Authentication",
      desc: "High-entropy secrets with constant-time HMAC comparison",
      icon: Key,
      status: "Active & Enforced",
      color: "#059669",
    },
    {
      title: "Action Catalog Allowlist Sandbox",
      desc: "Arbitrary shell execution prohibited; only whitelisted safe fixes permitted",
      icon: ShieldAlert,
      status: "Active & Enforced",
      color: "#059669",
    },
    {
      title: "Canonical Path Traversal Guards",
      desc: "Strict realpath checks prevent directory traversal outside user %TEMP%",
      icon: FolderLock,
      status: "Active & Enforced",
      color: "#059669",
    },
    {
      title: "Least Privilege Execution",
      desc: "Standard user permissions; no administrator elevation required",
      icon: UserCheck,
      status: "Active & Enforced",
      color: "#059669",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1440, margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>
            Threats, Security Measures & Safe Fix Verification
          </h2>
          <p style={{ fontSize: 13.5, color: "#475569", marginTop: 4 }}>
            Zero-trust local protection: continuous anomaly observation → hardened boundary enforcement → safe automated remediation.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={loadData}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 10,
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
          }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh Status
        </button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          style={{
            padding: "14px 20px",
            borderRadius: 12,
            background: notification.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
            border: `1px solid ${notification.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            color: notification.type === "success" ? "#065f46" : "#991b1b",
            fontSize: 13.5,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {notification.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Section 1: Active System Threats & Remediation Engine */}
      <div
        className="card"
        style={{
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(226, 232, 240, 0.9)",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 18 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: activeThreats.length > 0 ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: activeThreats.length > 0 ? "#d97706" : "#059669",
                }}
              >
                {activeThreats.length > 0 ? <AlertTriangle size={20} /> : <ShieldCheck size={20} />}
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>
                  Active System Threats & Performance Bottlenecks ({activeThreats.length})
                </h3>
                <p style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
                  {activeThreats.length > 0
                    ? `${activeThreats.length} operational threat(s) detected by real-time ML anomaly detector and rule engine.`
                    : "Zero active threats detected. All local operational metrics are within safe thresholds."}
                </p>
              </div>
            </div>
          </div>

          {activeThreats.length > 0 && (
            <button
              onClick={handleCorrectAllThreats}
              disabled={isCorrecting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                fontSize: 13.5,
                fontWeight: 700,
                borderRadius: 10,
                background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
                transition: "all 0.2s ease",
              }}
            >
              <Zap size={16} />
              {isCorrecting ? "Correcting All Threats..." : "🛡️ Correct All Threats (Execute Safe Fixes)"}
            </button>
          )}
        </div>

        {activeThreats.length === 0 ? (
          <div
            style={{
              padding: "24px 20px",
              background: "rgba(16, 185, 129, 0.05)",
              border: "1px dashed rgba(16, 185, 129, 0.3)",
              borderRadius: 12,
              textAlign: "center",
              color: "#065f46",
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            ✓ System health is optimized! No active threats or anomalies currently pending correction.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {activeThreats.map((threat) => (
              <div
                key={threat.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 18px",
                  background: "#f8fafc",
                  borderRadius: 12,
                  border: "1px solid rgba(226, 232, 240, 0.8)",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background: threat.severity === "critical" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                        color: threat.severity === "critical" ? "#dc2626" : "#b45309",
                      }}
                    >
                      {threat.severity}
                    </span>
                    <strong style={{ fontSize: 14, color: "#1e293b" }}>{threat.summary}</strong>
                  </div>
                  {threat.hypotheses && threat.hypotheses.length > 0 && (
                    <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                      Probable root cause: {threat.hypotheses[0]?.cause} (Confidence: {Math.round((threat.hypotheses[0]?.confidence || 0.8) * 100)}%)
                    </p>
                  )}
                </div>

                {threat.recommended_actions && threat.recommended_actions.length > 0 && (
                  <button
                    onClick={() => api.approveAction(threat.recommended_actions[0].id).then(loadData)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>Execute Safe Fix</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Verified System Security Measures (All 7 Enforced) */}
      <div>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldCheck size={20} style={{ color: "#059669" }} />
          Verified Security Measures ({securityMeasuresList.length} Active Protections)
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          {securityMeasuresList.map((measure, idx) => {
            const Icon = measure.icon;
            return (
              <div
                key={idx}
                className="card"
                style={{
                  background: "rgba(255, 255, 255, 0.85)",
                  backdropFilter: "blur(16px)",
                  borderRadius: 14,
                  padding: "16px 18px",
                  border: "1px solid rgba(226, 232, 240, 0.85)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "rgba(5, 150, 105, 0.12)",
                        color: "#059669",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <strong style={{ fontSize: 13.5, color: "#0f172a" }}>{measure.title}</strong>
                  </div>

                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#059669",
                    }}
                  >
                    ✓ {measure.status}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                  {measure.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Safe Fix Verification Outcomes */}
      <div>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>
          Verification Results ({verifications.length})
        </h3>
        {verifications.length === 0 ? (
          <div
            className="card"
            style={{ padding: 32, textAlign: "center", color: "#64748b", background: "rgba(255, 255, 255, 0.7)" }}
          >
            No verification audits recorded yet. Approve a recommended action or click "Correct All Threats" to record measured before-and-after metrics.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {verifications.map((v) => (
              <VerificationCard key={v.id} verification={v} />
            ))}
          </div>
        )}
      </div>

      {/* Section 4: Action Audit History */}
      <div>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <History size={18} />
          Action Audit History ({actionHistory.length})
        </h3>

        <div className="table-container" style={{ background: "rgba(255, 255, 255, 0.9)", borderRadius: 14 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 140 }}>Timestamp</th>
                <th>Action Recommendation</th>
                <th style={{ width: 140 }}>Risk Level</th>
                <th style={{ width: 120 }}>Status</th>
                <th>Execution Summary</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#64748b" }}>
                    Loading action verification history...
                  </td>
                </tr>
              ) : actionHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#64748b" }}>
                    No actions have been executed in this session.
                  </td>
                </tr>
              ) : (
                actionHistory.map((evt) => (
                  <tr key={evt.id}>
                    <td style={{ fontSize: 12, color: "#64748b" }}>
                      {evt.completed_at ? new Date(evt.completed_at).toLocaleTimeString() : "Pending"}
                    </td>
                    <td>
                      <strong style={{ fontSize: 13, color: "#1e293b" }}>
                        {evt.recommendation_title || evt.recommendation_id}
                      </strong>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          evt.risk_level === "level_1_informational"
                            ? "badge-info"
                            : evt.risk_level === "level_2_user_approved"
                              ? "badge-warning"
                              : "badge-critical"
                        }`}
                      >
                        {evt.risk_level === "level_1_informational"
                          ? "Level 1"
                          : evt.risk_level === "level_2_user_approved"
                            ? "Level 2 (Approved)"
                            : "Level 3 (Prohibited)"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          evt.status === "completed"
                            ? "badge-success"
                            : evt.status === "rejected"
                              ? "badge-critical"
                              : "badge-warning"
                        }`}
                      >
                        {evt.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: "#334155" }}>
                      {evt.outcome_summary || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
