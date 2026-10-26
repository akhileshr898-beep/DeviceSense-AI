import React, { useState } from "react";
import LiveCharts from "../components/LiveCharts";
import { BrainCircuit } from "lucide-react";

export default function LiveMonitor({ samples, latest }) {
  const [windowMinutes, setWindowMinutes] = useState(15);
  const sample = latest?.sample;

  const anomScore = sample?.anomaly_score ? (sample.anomaly_score * 100).toFixed(1) : 0;
  const isAnomaly = sample?.is_anomaly || false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header and Filter Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Real-time System Telemetry</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            High-frequency 2-second metric sampling with rolling-window ML anomaly scoring.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Time Horizon:</span>
          {[5, 15, 30].map((m) => (
            <button
              key={m}
              className={windowMinutes === m ? "btn-primary" : "btn-secondary"}
              style={{ padding: "6px 12px", fontSize: 12 }}
              onClick={() => setWindowMinutes(m)}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      {/* ML Anomaly Detector Status Banner */}
      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          background: isAnomaly
            ? "rgba(239, 68, 68, 0.08)"
            : "rgba(59, 130, 246, 0.06)",
          borderColor: isAnomaly
            ? "rgba(239, 68, 68, 0.3)"
            : "rgba(59, 130, 246, 0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: isAnomaly ? "var(--accent-red-bg)" : "var(--accent-blue-bg)",
              color: isAnomaly ? "var(--accent-red)" : "var(--accent-blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BrainCircuit size={24} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>
                ML IsolationForest Anomaly Engine
              </span>
              <span className={`badge ${isAnomaly ? "badge-critical" : "badge-success"}`}>
                {isAnomaly ? "ANOMALY FLAGGED" : "NORMAL PATTERN"}
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
              Multi-dimensional evaluation of CPU dispersion, memory pressure, I/O bursts, and process counts.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>ANOMALY PROBABILITY SCORE</div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: isAnomaly ? "var(--accent-red)" : "var(--accent-blue)",
              }}
            >
              {anomScore}%
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <LiveCharts samples={samples} />
    </div>
  );
}

