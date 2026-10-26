import React from "react";
import { AlertCircle, AlertTriangle, Info, Check, ArrowRight, X } from "lucide-react";

export default function DiagnosticCard({ finding, onSelectAction, onDismiss }) {
  const isResolved = finding.status === "resolved";
  const isDismissed = finding.status === "dismissed";

  const severityIcon = {
    critical: <AlertCircle size={18} style={{ color: "var(--accent-red)" }} />,
    warning: <AlertTriangle size={18} style={{ color: "var(--accent-yellow)" }} />,
    info: <Info size={18} style={{ color: "var(--accent-blue)" }} />,
  }[finding.severity] || <Info size={18} />;

  return (
    <div
      className="card"
      style={{
        borderLeft: `4px solid ${
          isResolved
            ? "var(--accent-green)"
            : finding.severity === "critical"
            ? "var(--accent-red)"
            : "var(--accent-yellow)"
        }`,
      }}
    >
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {severityIcon}
          <span style={{ fontWeight: 700, fontSize: 16 }}>{finding.summary}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={`badge badge-${finding.severity}`}>{finding.severity}</span>
          <span className={`badge ${isResolved ? "badge-success" : "badge-info"}`}>
            {finding.status}
          </span>
          {!isResolved && !isDismissed && onDismiss && (
            <button
              onClick={() => onDismiss(finding.id)}
              className="btn-secondary"
              style={{ padding: "4px 8px" }}
              title="Dismiss finding"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Evidence Section */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
          SUPPORTING EVIDENCE
        </div>
        <ul style={{ paddingLeft: 18, fontSize: 13, color: "var(--text-main)", lineHeight: 1.6 }}>
          {(finding.evidence || []).map((ev, i) => (
            <li key={i}>{ev}</li>
          ))}
        </ul>
      </div>

      {/* Hypotheses & Confidence */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
          ROOT CAUSE HYPOTHESES (CALIBRATED CONFIDENCE)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(finding.hypotheses || []).map((hyp, i) => {
            const confPct = Math.round(hyp.confidence * 100);
            return (
              <div
                key={i}
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  padding: "8px 12px",
                  borderRadius: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>{hyp.cause}</span>
                  <span style={{ fontWeight: 600, color: "var(--accent-blue)" }}>{confPct}%</span>
                </div>
                <div className="progress-bar-bg" style={{ height: 4, margin: 0 }}>
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${confPct}%`, backgroundColor: "var(--accent-blue)" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      {finding.recommendations && finding.recommendations.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>
            RECOMMENDED ACTIONS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {finding.recommendations.map((rec) => {
              const isCompleted = rec.latest_event && rec.latest_event.status === "completed";
              return (
                <div
                  key={rec.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "var(--bg-secondary)",
                    padding: "10px 14px",
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{rec.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                      Risk: {rec.risk_level.replace(/_/g, " ").toUpperCase()} • {rec.expected_benefit}
                    </div>
                  </div>

                  <div>
                    {isCompleted ? (
                      <span className="badge badge-success" style={{ padding: "6px 10px" }}>
                        <Check size={13} /> Completed
                      </span>
                    ) : (
                      <button
                        className="btn-primary"
                        style={{ fontSize: 12, padding: "6px 12px" }}
                        onClick={() => onSelectAction(rec)}
                      >
                        Review Fix <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

