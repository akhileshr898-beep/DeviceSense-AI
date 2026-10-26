import React from "react";
import { Cpu, HardDrive, Wifi, Battery, Zap, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";
import MetricCard from "../components/MetricCard";
import DiagnosticCard from "../components/DiagnosticCard";

export default function Overview({ latest, diagnostics, onSelectAction, onDismiss, setActiveTab }) {
  const sample = latest?.sample;

  // Compute System Health Score (0 to 100)
  let healthScore = 100;
  if (sample) {
    if (sample.cpu_percent > 85) healthScore -= 20;
    else if (sample.cpu_percent > 70) healthScore -= 10;

    if (sample.memory_percent > 85) healthScore -= 25;
    else if (sample.memory_percent > 75) healthScore -= 12;

    if (sample.disk_percent > 90) healthScore -= 20;
    if (sample.net_latency_ms > 150) healthScore -= 10;
  }
  const activeAlerts = (diagnostics || []).filter((d) => d.status === "active");
  healthScore -= activeAlerts.length * 10;
  healthScore = Math.max(Math.min(healthScore, 100), 10);

  const healthColor = healthScore > 80 ? "emerald" : healthScore > 50 ? "amber" : "rose";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Top Banner: Health Score & Device Info */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
          background: "linear-gradient(135deg, rgba(22, 32, 51, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: `var(--accent-${healthColor}-bg)`,
              border: `3px solid var(--accent-${healthColor})`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 26, fontWeight: 800, color: `var(--accent-${healthColor})` }}>
              {healthScore}
            </span>
            <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Health</span>
          </div>

          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
              System Health: {healthScore > 80 ? "Optimal" : healthScore > 50 ? "Degraded" : "Critical Attention"}
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {activeAlerts.length === 0
                ? "All system metrics within nominal bounds. No critical bottlenecks observed."
                : `${activeAlerts.length} active diagnostic findings require user attention.`}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" onClick={() => setActiveTab("live")}>
            View Telemetry
          </button>
          <button className="btn-primary" onClick={() => setActiveTab("settings")}>
            Run Diagnostic Simulation
          </button>
        </div>
      </div>

      {/* Key Metric Gauges */}
      <div className="grid-4">
        <MetricCard
          title="CPU Load"
          value={sample ? `${sample.cpu_percent}%` : "—"}
          subtext="Processor Utilization"
          icon={Cpu}
          percent={sample?.cpu_percent}
          color={sample?.cpu_percent > 85 ? "rose" : sample?.cpu_percent > 65 ? "amber" : "blue"}
        />

        <MetricCard
          title="RAM Utilization"
          value={sample ? `${sample.memory_percent}%` : "—"}
          subtext={
            sample
              ? `${(sample.memory_available_bytes / (1024 ** 3)).toFixed(1)} GB Available`
              : "Memory Buffer"
          }
          icon={Zap}
          percent={sample?.memory_percent}
          color={sample?.memory_percent > 85 ? "rose" : sample?.memory_percent > 70 ? "amber" : "purple"}
        />

        <MetricCard
          title="System Storage"
          value={sample ? `${sample.disk_percent}%` : "—"}
          subtext={
            sample
              ? `${(sample.disk_free_bytes / (1024 ** 3)).toFixed(1)} GB Free (C:)`
              : "Volume Health"
          }
          icon={HardDrive}
          percent={sample?.disk_percent}
          color={sample?.disk_percent > 90 ? "rose" : "emerald"}
        />

        <MetricCard
          title="Network Latency"
          value={sample ? `${sample.net_latency_ms} ms` : "—"}
          subtext={
            sample
              ? `Down: ${(sample.net_bytes_recv_sec / 1024).toFixed(0)} KB/s`
              : "Gateway Ping"
          }
          icon={Wifi}
          color={sample?.net_latency_ms > 150 ? "rose" : "blue"}
          badge={
            sample?.battery_percent !== null && sample?.battery_percent !== undefined
              ? { label: `${sample.battery_percent}% Bat`, type: "info" }
              : null
          }
        />
      </div>

      {/* Active Diagnostics Section */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={20} style={{ color: "var(--accent-yellow)" }} />
            Active Diagnostic Findings ({activeAlerts.length})
          </h3>
          <button className="btn-secondary" onClick={() => setActiveTab("diagnostics")}>
            View All ({diagnostics.length})
          </button>
        </div>

        {activeAlerts.length === 0 ? (
          <div
            className="card"
            style={{
              padding: 40,
              textAlign: "center",
              background: "rgba(16, 185, 129, 0.05)",
              borderColor: "rgba(16, 185, 129, 0.2)",
            }}
          >
            <CheckCircle2 size={40} style={{ color: "var(--accent-green)", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>No Active Anomalies Detected</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              The agent is actively monitoring CPU, memory, storage, and network health.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {activeAlerts.map((finding) => (
              <DiagnosticCard
                key={finding.id}
                finding={finding}
                onSelectAction={onSelectAction}
                onDismiss={onDismiss}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
