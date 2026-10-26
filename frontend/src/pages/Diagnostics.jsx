import React, { useState } from "react";
import DiagnosticCard from "../components/DiagnosticCard";
import { AlertCircle, Filter, CheckCircle2 } from "lucide-react";

export default function Diagnostics({ diagnostics, onSelectAction, onDismiss }) {
  const [filter, setFilter] = useState("all");

  const filtered = diagnostics.filter((d) => {
    if (filter === "all") return true;
    return d.status === filter;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Diagnostics & Findings</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Deterministic rule detection + ML anomaly hypotheses mapped to evidence.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Filter size={15} style={{ color: "var(--text-dim)" }} />
          {["all", "active", "resolved", "dismissed"].map((st) => (
            <button
              key={st}
              className={filter === st ? "btn-primary" : "btn-secondary"}
              style={{ padding: "6px 12px", fontSize: 12, textTransform: "capitalize" }}
              onClick={() => setFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          className="card"
          style={{
            padding: 48,
            textAlign: "center",
            background: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <CheckCircle2 size={40} style={{ color: "var(--accent-blue)", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>No Findings in this Category</div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Select "All" or trigger a scenario from Simulation & Controls.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtered.map((diag) => (
            <DiagnosticCard
              key={diag.id}
              finding={diag}
              onSelectAction={onSelectAction}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}
