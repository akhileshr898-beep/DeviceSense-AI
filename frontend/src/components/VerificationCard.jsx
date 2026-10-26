import React from "react";
import { HelpCircle, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export default function VerificationCard({ verification }) {
  const isImproved = verification.outcome === "improved";
  const isWorsened = verification.outcome === "worsened";

  const outcomeBadge = {
    improved: { label: "IMPROVED", class: "badge-success", icon: ArrowDownRight },
    worsened: { label: "WORSENED", class: "badge-critical", icon: ArrowUpRight },
    unchanged: { label: "UNCHANGED", class: "badge-warning", icon: Minus },
    inconclusive: { label: "INCONCLUSIVE", class: "badge-info", icon: HelpCircle },
  }[verification.outcome] || { label: verification.outcome, class: "badge-info", icon: HelpCircle };

  const Icon = outcomeBadge.icon;

  return (
    <div className="card" style={{ background: "var(--bg-secondary)" }}>
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            Verification Audit #{verification.id.slice(-6)}
          </span>
          <span className="card-subtext">Metric: <code>{verification.metric_name}</code></span>
        </div>
        <span className={`badge ${outcomeBadge.class}`}>
          <Icon size={13} /> {outcomeBadge.label}
        </span>
      </div>

      {/* Before / After Metrics Comparison */}
      <div
        className="grid-3"
        style={{
          background: "var(--bg-card)",
          padding: "12px 16px",
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>BASELINE MEASUREMENT</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-muted)" }}>
            {verification.baseline_value}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>POST-ACTION MEASURED</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: isImproved ? "var(--accent-green)" : "var(--text-main)" }}>
            {verification.measured_value}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>OBSERVED DELTA</div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: isImproved ? "var(--accent-green)" : isWorsened ? "var(--accent-red)" : "var(--text-dim)",
            }}
          >
            {verification.delta_value > 0 ? `+${verification.delta_value}` : verification.delta_value}
          </div>
        </div>
      </div>

      {/* Evidence & Caveats */}
      {verification.evidence && (
        <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>
          <div>{verification.evidence.evaluation_note}</div>
          <div style={{ fontStyle: "italic", marginTop: 4, color: "var(--text-muted)" }}>
            Note: {verification.evidence.caveat}
          </div>
        </div>
      )}
    </div>
  );
}

