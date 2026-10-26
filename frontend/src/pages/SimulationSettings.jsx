import React, { useState } from "react";
import { Play, RotateCcw, Sliders, Shield, Database, Cpu, Zap, HardDrive, Wifi } from "lucide-react";
import { api } from "../services/api";

export default function SimulationSettings({ onSimulationTriggered }) {
  const [loadingScenario, setLoadingScenario] = useState(null);
  const [message, setMessage] = useState(null);

  const scenarios = [
    {
      id: "cpu_overload",
      title: "Sustained CPU Overload",
      desc: "Simulates continuous 94% CPU load over 3+ sampling windows.",
      icon: Cpu,
      color: "var(--accent-red)",
      sampleCount: 3,
    },
    {
      id: "memory_pressure",
      title: "High Memory Pressure",
      desc: "Simulates 93.8% RAM allocation with under 1 GB available memory.",
      icon: Zap,
      color: "var(--accent-purple)",
      sampleCount: 3,
    },
    {
      id: "disk_warning",
      title: "Storage Capacity Warning",
      desc: "Simulates C: drive with only 6.2 GB free and 98% utilization.",
      icon: HardDrive,
      color: "var(--accent-yellow)",
      sampleCount: 2,
    },
    {
      id: "network_spike",
      title: "Network Degradation",
      desc: "Simulates high round-trip ping (285ms) with 8.5% packet loss.",
      icon: Wifi,
      color: "var(--accent-blue)",
      sampleCount: 2,
    },
    {
      id: "normal",
      title: "Healthy Baseline (Reset)",
      desc: "Simulates standard healthy desktop operation (15% CPU, 52% RAM).",
      icon: RotateCcw,
      color: "var(--accent-green)",
      sampleCount: 3,
    },
  ];

  const handleRunSimulation = async (scenario) => {
    setLoadingScenario(scenario.id);
    setMessage(null);
    try {
      const res = await api.triggerSimulation(scenario.id, scenario.sampleCount);
      setMessage({ type: "success", text: res.message });
      if (onSimulationTriggered) {
        onSimulationTriggered();
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoadingScenario(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Simulation & Diagnostic Controls</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Inject controlled test workloads to demonstrate deterministic rules, ML anomaly detection, and safe verification.
        </p>
      </div>

      {message && (
        <div
          className={`badge ${message.type === "success" ? "badge-success" : "badge-critical"}`}
          style={{ padding: "10px 16px", fontSize: 13, width: "fit-content" }}
        >
          {message.text}
        </div>
      )}

      {/* Scenario Grid */}
      <div className="grid-2">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          const isLoading = loadingScenario === sc.id;
          return (
            <div key={sc.id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "rgba(255, 255, 255, 0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: sc.color,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <h4 style={{ fontSize: 16, fontWeight: 700 }}>{sc.title}</h4>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 16 }}>
                  {sc.desc}
                </p>
              </div>

              <button
                className="btn-primary"
                onClick={() => handleRunSimulation(sc)}
                disabled={isLoading}
                style={{ width: "fit-content" }}
              >
                <Play size={14} /> {isLoading ? "Injecting Scenario..." : "Inject Scenario"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Security & System Configuration Info */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <Shield size={16} /> Security Controls
            </span>
          </div>
          <ul style={{ paddingLeft: 18, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.8 }}>
            <li>Loopback Only: Bound strictly to <code>127.0.0.1:5000</code></li>
            <li>Agent Authentication: Constant-time HMAC token validation</li>
            <li>Browser Origin: Restricted to <code>localhost:5173</code></li>
            <li>Privilege Model: Runs as standard non-admin Windows process</li>
            <li>Arbitrary Command Execution: <strong>Strictly Prohibited</strong></li>
          </ul>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <Database size={16} /> Data Retention & Engine
            </span>
          </div>
          <ul style={{ paddingLeft: 18, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.8 }}>
            <li>Persistence: SQLite <code>devicesense.db</code> with SQLAlchemy ORM</li>
            <li>Raw Metric Samples: Retained for 7 days</li>
            <li>ML Model: scikit-learn IsolationForest (rolling window)</li>
            <li>Diagnostic Rules: Calibrated persistent-threshold filters</li>
            <li>Verification: Pre vs. Post window delta comparisons</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
