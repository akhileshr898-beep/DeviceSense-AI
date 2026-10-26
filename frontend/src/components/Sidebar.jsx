import React from "react";
import {
  Home,
  Activity,
  Search,
  Stethoscope,
  ShieldCheck,
  FileText,
  FlaskConical,
  Clock,
  Settings,
  Shield,
} from "lucide-react";

export default function Sidebar({ activeTab, setActiveTab, agentStatus }) {
  const navItems = [
    { id: "overview", label: "Overview", icon: Home },
    { id: "live", label: "Live Telemetry", icon: Activity },
    { id: "processes", label: "Process Investigator", icon: Search },
    { id: "diagnostics", label: "Diagnostics AI", icon: Stethoscope },
    { id: "actions", label: "Fix Verification", icon: ShieldCheck },
    { id: "reports", label: "Technician Reports", icon: FileText },
    { id: "simulation", label: "Simulation Lab", icon: FlaskConical },
    { id: "audit", label: "Audit Log", icon: Clock },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon-wrapper">
          <Shield size={24} className="brand-shield" />
          <Activity size={14} className="brand-pulse" />
        </div>
        <div className="brand-text">
          <div className="brand-title">DeviceSense AI</div>
          <div className="brand-tagline">Smart. Detect. Optimize.</div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`sidebar-nav-item ${isActive ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} className="nav-icon" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Agent Status Footer Widget */}
      <div className="sidebar-footer">
        <div className="agent-status-card">
          <div className="status-header">
            <span className={`status-beacon ${agentStatus}`} />
            <span className="status-title">Agent Connected</span>
          </div>
          <div className="status-details">
            <span className="status-version">v1.3.2 • Online</span>
            <span className="status-sync">Last sync: 2s ago</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
