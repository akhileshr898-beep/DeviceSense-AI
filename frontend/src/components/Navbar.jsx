import React from "react";
import {
  Activity,
  Cpu,
  ListFilter,
  AlertTriangle,
  CheckCircle,
  FileText,
  Sliders,
  RefreshCw,
} from "lucide-react";

export default function Navbar({ activeTab, setActiveTab, agentStatus, onRefresh, isRefreshing }) {
  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "live", label: "Live Telemetry", icon: Cpu },
    { id: "processes", label: "Process Investigator", icon: ListFilter },
    { id: "diagnostics", label: "Diagnostics & AI", icon: AlertTriangle },
    { id: "actions", label: "Fixes & Verification", icon: CheckCircle },
    { id: "reports", label: "Technician Reports", icon: FileText },
    { id: "settings", label: "Simulation & Controls", icon: Sliders },
  ];

  return (
    <header className="navbar">
      <div className="nav-brand">
        <div className="brand-logo">DS</div>
        <div>
          <span className="brand-title">DeviceSense AI</span>
          <span className="brand-tag">Windows PC Diagnostics</span>
        </div>
      </div>

      <nav className="nav-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`nav-tab ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="nav-status">
        <div className="status-pill">
          <div className={`status-dot ${agentStatus}`} />
          <span>
            Agent: {agentStatus === "connected" ? "Live" : agentStatus === "stale" ? "Stale" : "Offline"}
          </span>
        </div>

        <button
          className="btn-secondary"
          onClick={onRefresh}
          title="Refresh dashboard"
          style={{ padding: "8px 10px" }}
        >
          <RefreshCw size={15} className={isRefreshing ? "spin-animation" : ""} />
        </button>
      </div>
    </header>
  );
}
