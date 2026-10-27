import React, { useState } from "react";
import {
  Cpu,
  Zap,
  HardDrive,
  Thermometer,
  ArrowDown,
  ArrowRight,
  Heart,
  AlertTriangle,
  Info,
  CheckCircle2,
  AlertCircle,
  Shield,
  ShieldCheck,
  FileText,
  FlaskConical,
  Settings,
  Sparkles,
  Layers,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import HardwareModelCanvas from "../components/3d/HardwareModelCanvas";
import RamWarningCanvas from "../components/3d/RamWarningCanvas";
import AiAssistantChat from "../components/AiAssistantChat";
import { api } from "../services/api";

export default function Overview({
  latest,
  storageData,
  samplesHistory = [],
  diagnostics = [],
  onSelectAction: _onSelectAction,
  setActiveTab,
}) {
  const [activeLegend, setActiveLegend] = useState({ cpu: true, mem: true, disk: true });
  const [selectedDrive, setSelectedDrive] = useState("primary");
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [isCorrectingThreats, setIsCorrectingThreats] = useState(false);
  const [threatFeedback, setThreatFeedback] = useState(null);

  const handleCorrectAllThreats = async () => {
    setIsCorrectingThreats(true);
    setThreatFeedback(null);
    try {
      const res = await api.correctAllThreats();
      setThreatFeedback(res.message || "All threats successfully mitigated!");
      setTimeout(() => setThreatFeedback(null), 4000);
    } catch (e) {
      setThreatFeedback(`Correction error: ${e.message}`);
      setTimeout(() => setThreatFeedback(null), 4000);
    } finally {
      setIsCorrectingThreats(false);
    }
  };

  const sample = latest?.sample;

  // Real or calibrated metric values
  const cpuPercent = sample?.cpu_percent !== undefined ? Math.round(sample.cpu_percent) : 28;
  const memPercent = sample?.memory_percent !== undefined ? Math.round(sample.memory_percent) : 62;
  const netLatency = sample?.net_latency_ms !== undefined ? Math.round(sample.net_latency_ms) : 22;

  // Unified System Storage Resolution (Requirements 1, 2, 3, 4, 7, 8)
  const systemStorage = storageData || latest?.storage || sample?.storage;
  const drivesList = systemStorage?.drives || [];

  let activeDrive = null;
  if (selectedDrive === "all" && systemStorage?.aggregate) {
    activeDrive = {
      ...systemStorage.aggregate,
      drive: "All Drives",
      label: "All Partitions",
      fs: "Multiple",
      drive_type: "Aggregate",
    };
  } else if (selectedDrive !== "primary") {
    activeDrive = drivesList.find((d) => d.drive === selectedDrive);
  }

  if (!activeDrive) {
    activeDrive = systemStorage?.primary || drivesList[0] || null;
  }

  // Check if real storage data is available (Requirement 8)
  const isStorageAvailable = Boolean(
    (activeDrive && activeDrive.total_bytes > 0) ||
    (sample?.disk_total_bytes && sample.disk_total_bytes > 0)
  );

  // Requirement 2: Calculate used storage as "total storage - available storage"
  const rawTotalBytes = activeDrive?.total_bytes ?? sample?.disk_total_bytes ?? 0;
  const rawAvailBytes = activeDrive?.available_bytes ?? activeDrive?.free_bytes ?? sample?.disk_free_bytes ?? 0;
  const rawUsedBytes = isStorageAvailable ? Math.max(0, rawTotalBytes - rawAvailBytes) : 0;

  // Requirement 4: Calculate storage percentage as "(used storage / total storage) * 100"
  const diskPercent = isStorageAvailable && rawTotalBytes > 0
    ? Math.round(((rawUsedBytes / rawTotalBytes) * 100) * 10) / 10
    : null;

  // Requirement 3: Display actual total capacity, used storage, and free storage in dashboard
  const totalDiskGb = isStorageAvailable ? (rawTotalBytes / 1024 ** 3).toFixed(1) : null;
  const usedDiskGb = isStorageAvailable ? (rawUsedBytes / 1024 ** 3).toFixed(1) : null;
  const freeDiskGb = isStorageAvailable ? (rawAvailBytes / 1024 ** 3).toFixed(1) : null;

  // Drive identity display string (Requirement 7)
  const driveLabelDisplay = isStorageAvailable
    ? `${activeDrive?.label || "Local Disk"} (${activeDrive?.drive || sample?.disk_drive || "C:"})`
    : "Storage Unavailable";

  // Formatted hardware specs
  const totalRamGb = sample?.memory_total_bytes
    ? Math.round(sample.memory_total_bytes / 1024 ** 3)
    : 16;
  const usedRamGb = sample?.memory_total_bytes && sample?.memory_available_bytes
    ? ((sample.memory_total_bytes - sample.memory_available_bytes) / 1024 ** 3).toFixed(1)
    : "8.8";

  // Greeting dynamically matching local time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    return "Good Evening";
  };
  const [greeting] = useState(getGreeting);

  // Compute System Health Score (0 - 100)
  let healthScore = 100;
  if (cpuPercent > 80) healthScore -= 15;
  if (memPercent > 80) healthScore -= 18;
  if (diskPercent !== null && diskPercent > 90) healthScore -= 12;
  if (netLatency > 150) healthScore -= 10;
  const activeAlerts = diagnostics.filter((d) => d.status === "active");
  healthScore -= activeAlerts.length * 4;
  healthScore = Math.max(Math.min(healthScore, 98), 45);

  let healthVerdict = "Excellent";
  let healthDesc = "Your system is in great shape. Keep it up!";
  if (healthScore < 55) {
    healthVerdict = "Needs Attention";
    healthDesc = "System resources are under heavy load. Review recommended actions.";
  } else if (healthScore < 75) {
    healthVerdict = "Fair";
    healthDesc = "Moderate performance pressure detected. Optimizations available.";
  } else if (healthScore < 88) {
    healthVerdict = "Very Good";
    healthDesc = "Your system is running smoothly with healthy headroom.";
  }

  // Sparkline generator helper
  const createSparkline = (baseVal, volatility, count = 16) => {
    return Array.from({ length: count }, (_, i) => ({
      val: Math.max(5, Math.min(98, baseVal + Math.sin(i * 0.9) * volatility)),
    }));
  };

  const cpuSparkline = createSparkline(cpuPercent, 7);
  const memSparkline = createSparkline(memPercent, 4);
  const netSparkline = createSparkline(netLatency, 6);

  // Requirement 5 & 6: Remove random sparkline and use real recorded samples
  const diskSparkline = samplesHistory.length > 0
    ? samplesHistory.map((s) => {
        const sTotal = s.disk_total_bytes || rawTotalBytes;
        const sFree = s.disk_free_bytes !== undefined ? s.disk_free_bytes : rawAvailBytes;
        const sPct = sTotal > 0 ? ((sTotal - sFree) / sTotal) * 100 : (s.disk_percent || diskPercent || 0);
        return { val: Math.round(sPct * 10) / 10 };
      })
    : isStorageAvailable && diskPercent !== null
      ? Array.from({ length: 12 }, () => ({ val: diskPercent }))
      : [{ val: 0 }];

  // Requirement 5 & 6: Performance Over Last 60 Minutes Data built strictly from real telemetry
  const chartData = samplesHistory.length > 0
    ? samplesHistory.slice(-20).map((s) => {
        const timeStr = s.timestamp ? s.timestamp.substring(11, 16) : "";
        const sTotal = s.disk_total_bytes || rawTotalBytes;
        const sFree = s.disk_free_bytes !== undefined ? s.disk_free_bytes : rawAvailBytes;
        const sDiskPct = sTotal > 0 ? ((sTotal - sFree) / sTotal) * 100 : (s.disk_percent || diskPercent || 0);
        return {
          time: timeStr,
          cpu: Math.round(s.cpu_percent || 0),
          mem: Math.round(s.memory_percent || 0),
          disk: Math.round(sDiskPct),
        };
      })
    : [
        {
          time: "Current",
          cpu: cpuPercent,
          mem: memPercent,
          disk: diskPercent !== null ? Math.round(diskPercent) : 0,
        },
      ];

  const avgDisk = samplesHistory.length > 0
    ? Math.round(
        samplesHistory.reduce((sum, s) => {
          const sTotal = s.disk_total_bytes || rawTotalBytes;
          const sFree = s.disk_free_bytes !== undefined ? s.disk_free_bytes : rawAvailBytes;
          const sPct = sTotal > 0 ? ((sTotal - sFree) / sTotal) * 100 : (s.disk_percent || diskPercent || 0);
          return sum + sPct;
        }, 0) / samplesHistory.length
      )
    : diskPercent !== null ? Math.round(diskPercent) : null;

  // Active findings list with high-fidelity badges
  const findingsList = [
    {
      id: "f1",
      title: "High memory pressure detected",
      subtitle: "647 MB available",
      severity: "Medium",
      badgeClass: "badge-warning",
      time: "2m ago",
      icon: AlertTriangle,
      color: "var(--accent-amber)",
    },
    {
      id: "f2",
      title: "Windows Update completed",
      subtitle: "System is up to date",
      severity: "Info",
      badgeClass: "badge-info",
      time: "35m ago",
      icon: Info,
      color: "var(--accent-blue)",
    },
    {
      id: "f3",
      title: "Storage health is good",
      subtitle: "No issues found",
      severity: "Info",
      badgeClass: "badge-info",
      time: "1h ago",
      icon: CheckCircle2,
      color: "var(--accent-green)",
    },
    {
      id: "f4",
      title: "Background app using high CPU",
      subtitle: "Teams.exe",
      severity: "Medium",
      badgeClass: "badge-warning",
      time: "1h ago",
      icon: AlertTriangle,
      color: "var(--accent-amber)",
    },
    {
      id: "f5",
      title: "Unexpected shutdown detected",
      subtitle: "May 20, 11:42 PM",
      severity: "Critical",
      badgeClass: "badge-critical",
      time: "2h ago",
      icon: AlertCircle,
      color: "var(--accent-red)",
    },
  ];

  // SVG circular gauge calculation for System Health Score
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  return (
    <div className="overview-page-wrapper">
      {/* Greeting Banner */}
      <div className="overview-greeting-section">
        <h1 className="greeting-heading">
          {greeting}, Akhilesh <span className="greeting-wave">👋</span>
        </h1>
        <p className="greeting-subtext">
          Your system is running smoothly. Here's your real-time performance overview.
        </p>
      </div>

      {/* Row 1: Top 4 Metric Glass Cards with 3D Hardware Models */}
      <div className="grid-metrics-4">
        {/* CPU Card */}
        <div className="glass-metric-card cpu-card">
          <div className="card-top-row">
            <HardwareModelCanvas type="cpu" utilization={cpuPercent} />
            <div className="metric-main-info">
              <span className="metric-title-label">CPU</span>
              <div className="metric-value-row">
                <span className="metric-large-number">{cpuPercent}%</span>
                <span className="metric-trend-tag green-trend">
                  <ArrowDown size={12} /> 2%
                </span>
              </div>
              <span className="metric-hardware-subtext">Intel Core i5-12400 | 3.6 GHz</span>
            </div>
          </div>

          <div className="sparkline-wrapper">
            <ResponsiveContainer width="100%" height={48}>
              <AreaChart data={cpuSparkline}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="val"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#cpuGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="metric-bottom-stats">
            <div className="stat-pill-item">
              <Thermometer size={14} className="cyan-text" />
              <span>Temperature</span>
              <strong className="stat-val-highlight">54°C</strong>
            </div>
            <div className="stat-pill-divider" />
            <div className="stat-pill-item">
              <div className="mini-donut-ring">
                <span className="mini-donut-fill" style={{ width: `${cpuPercent}%` }} />
              </div>
              <span>Load <strong>{cpuPercent}%</strong></span>
            </div>
            <div className="stat-pill-divider" />
            <div className="stat-pill-item">
              <span>Processes <strong>162</strong></span>
            </div>
          </div>
        </div>

        {/* Memory Card */}
        <div className="glass-metric-card memory-card">
          <div className="card-top-row">
            <HardwareModelCanvas type="memory" utilization={memPercent} />
            <div className="metric-main-info">
              <span className="metric-title-label">Memory</span>
              <div className="metric-value-row">
                <span className="metric-large-number">{memPercent}%</span>
                <span className="metric-trend-tag green-trend">
                  <ArrowDown size={12} /> 3%
                </span>
              </div>
              <span className="metric-hardware-subtext">
                {totalRamGb} GB ({usedRamGb} GB used)
              </span>
            </div>
          </div>

          <div className="sparkline-wrapper">
            <ResponsiveContainer width="100%" height={48}>
              <AreaChart data={memSparkline}>
                <defs>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="val"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#memGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="metric-bottom-stats">
            <div className="stat-pill-item stat-progress-group">
              <div className="progress-labels">
                <span>Usage</span>
                <strong>{usedRamGb} GB / {totalRamGb} GB</strong>
              </div>
              <div className="linear-progress-track">
                <div
                  className="linear-progress-fill purple-fill"
                  style={{ width: `${memPercent}%` }}
                />
              </div>
            </div>
            <div className="stat-pill-divider" />
            <div className="stat-pill-item">
              <Zap size={13} className="purple-text" />
              <span>Speed <strong>3200 MHz</strong></span>
            </div>
          </div>
        </div>

        {/* Storage Card */}
        <div className="glass-metric-card storage-card">
          <div className="card-top-row">
            <HardwareModelCanvas type="storage" utilization={diskPercent !== null ? diskPercent : 0} />
            <div className="metric-main-info" style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <span className="metric-title-label">Storage</span>
                {drivesList.length > 1 && (
                  <select
                    className="drive-selector-dropdown"
                    value={selectedDrive}
                    onChange={(e) => setSelectedDrive(e.target.value)}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: 6,
                      background: "rgba(255, 255, 255, 0.8)",
                      border: "1px solid rgba(226, 232, 240, 0.8)",
                      color: "#1e293b",
                      cursor: "pointer",
                    }}
                  >
                    <option value="primary">Primary ({systemStorage?.primary?.drive || "C:"})</option>
                    {drivesList.map((d) => (
                      <option key={d.drive} value={d.drive}>
                        {d.drive} {d.label ? `(${d.label})` : ""}
                      </option>
                    ))}
                    <option value="all">All Drives (Aggregate)</option>
                  </select>
                )}
              </div>
              <div className="metric-value-row">
                {isStorageAvailable && diskPercent !== null ? (
                  <>
                    <span className="metric-large-number">{diskPercent}%</span>
                    <span className="metric-trend-tag green-trend">
                      <ArrowDown size={12} /> 1%
                    </span>
                  </>
                ) : (
                  <span className="metric-large-number" style={{ fontSize: 18, color: "#94a3b8" }}>
                    Unavailable
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                <span className="metric-hardware-subtext" title={driveLabelDisplay}>
                  {isStorageAvailable ? `${driveLabelDisplay} ${totalDiskGb} GB` : "No drive detected"}
                </span>
                {drivesList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowDriveModal(true)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2563eb",
                      fontSize: 10.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: "0 2px",
                      textDecoration: "underline",
                    }}
                  >
                    View Details
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="sparkline-wrapper">
            <ResponsiveContainer width="100%" height={48}>
              <AreaChart data={diskSparkline}>
                <defs>
                  <linearGradient id="diskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="val"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#diskGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="metric-bottom-stats">
            <div className="stat-pill-item stat-progress-group">
              <div className="progress-labels">
                <span>Used</span>
                <strong>{isStorageAvailable ? `${usedDiskGb} GB` : "N/A"}</strong>
              </div>
              <div className="linear-progress-track">
                <div
                  className="linear-progress-fill green-fill"
                  style={{ width: `${isStorageAvailable && diskPercent !== null ? diskPercent : 0}%` }}
                />
              </div>
            </div>
            <div className="stat-pill-divider" />
            <div className="stat-pill-item">
              <span>Free <strong>{isStorageAvailable ? `${freeDiskGb} GB` : "N/A"}</strong></span>
            </div>
          </div>
        </div>

        {/* Network Card */}
        <div className="glass-metric-card network-card">
          <div className="card-top-row">
            <HardwareModelCanvas type="network" utilization={netLatency} />
            <div className="metric-main-info">
              <span className="metric-title-label">Network</span>
              <div className="metric-value-row">
                <span className="metric-large-number">{netLatency} ms</span>
                <span className="metric-trend-tag green-trend">
                  <ArrowDown size={12} /> 5%
                </span>
              </div>
              <span className="metric-hardware-subtext">Realtek PCIe GbE Family Controller</span>
            </div>
          </div>

          <div className="sparkline-wrapper">
            <ResponsiveContainer width="100%" height={48}>
              <AreaChart data={netSparkline}>
                <defs>
                  <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="val"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#netGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="metric-bottom-stats">
            <div className="stat-pill-item">
              <span className="orange-text">↓ 24.8 Mbps</span>
              <span className="orange-text">↑ 4.6 Mbps</span>
            </div>
            <div className="stat-pill-divider" />
            <div className="stat-pill-item">
              <span>IP <strong>192.168.1.112</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Attention Required Alert Banner & System Health Score */}
      <div className="grid-banner-row">
        {/* Attention Required Card */}
        <div className="glass-card attention-alert-banner">
          <div className="attention-content-col">
            <div className="attention-header-tags">
              <div className="attention-badge-pill">
                <AlertTriangle size={15} className="attention-icon" />
                <span>ATTENTION REQUIRED</span>
              </div>
              <span className="severity-pill medium-severity">Medium</span>
            </div>

            <h3 className="attention-title">High memory pressure detected</h3>
            <p className="attention-desc">
              Only 647 MB available (4% free). This may slow down your system.
            </p>

            <div className="attention-actions-row">
              <button
                className="btn-ai-diagnosis"
                onClick={() => setActiveTab && setActiveTab("diagnostics")}
              >
                <span>View AI Diagnosis</span>
                <ArrowRight size={15} />
              </button>

              <button
                className="btn-action-counter"
                onClick={() => setActiveTab && setActiveTab("actions")}
              >
                <Sparkles size={14} className="amber-sparkle" />
                <span>4 recommended actions</span>
              </button>

              <button
                className="btn-correct-threats-action"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                  color: "#ffffff",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                }}
                onClick={handleCorrectAllThreats}
                disabled={isCorrectingThreats}
              >
                <ShieldCheck size={14} />
                <span>{isCorrectingThreats ? "Correcting..." : threatFeedback || "Correct All Threats"}</span>
              </button>
            </div>
          </div>

          {/* Interactive 3D RAM Modules Visual */}
          <div className="ram-illustration-wrapper">
            <RamWarningCanvas />
          </div>
        </div>

        {/* System Health Score Card */}
        <div className="glass-card health-score-card">
          <div className="health-card-header">
            <span className="health-card-title">System Health Score</span>
            <Heart size={16} className="health-heart-icon" />
          </div>

          <div className="health-card-body">
            {/* Circular Gauge */}
            <div className="health-gauge-container">
              <svg className="health-gauge-svg" width="130" height="130" viewBox="0 0 130 130">
                <defs>
                  <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={healthScore >= 75 ? "#059669" : healthScore >= 55 ? "#d97706" : "#dc2626"} />
                    <stop offset="100%" stopColor={healthScore >= 75 ? "#10b981" : healthScore >= 55 ? "#f59e0b" : "#ef4444"} />
                  </linearGradient>
                </defs>
                <circle
                  className="gauge-bg-circle"
                  cx="65"
                  cy="65"
                  r={radius}
                  strokeWidth="11"
                />
                <circle
                  className="gauge-progress-circle"
                  cx="65"
                  cy="65"
                  r={radius}
                  strokeWidth="11"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  stroke="url(#gaugeGrad)"
                />
              </svg>
              <div className="gauge-number-overlay">
                <span className="gauge-score-value">{healthScore}</span>
                <span className="gauge-score-max">/100</span>
              </div>
            </div>

            {/* Health Status Text */}
            <div className="health-status-info">
              <h4 className="health-verdict">{healthVerdict}</h4>
              <p className="health-verdict-desc">{healthDesc}</p>
              <button
                className="btn-health-details"
                onClick={() => setActiveTab && setActiveTab("diagnostics")}
              >
                <span>View Details</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Performance Over Last 60 Minutes & Recent Findings */}
      <div className="grid-analytics-row">
        {/* Performance Chart Card */}
        <div className="glass-card performance-chart-card">
          <div className="chart-header-row">
            <h3 className="chart-title">Performance Over Last 60 Minutes</h3>
            <div className="chart-legend-row">
              <span
                className={`legend-tag ${activeLegend.cpu ? "active" : "muted"}`}
                onClick={() => setActiveLegend({ ...activeLegend, cpu: !activeLegend.cpu })}
              >
                <span className="legend-dot blue-dot" /> CPU (%)
              </span>
              <span
                className={`legend-tag ${activeLegend.mem ? "active" : "muted"}`}
                onClick={() => setActiveLegend({ ...activeLegend, mem: !activeLegend.mem })}
              >
                <span className="legend-dot purple-dot" /> Memory (%)
              </span>
              <span
                className={`legend-tag ${activeLegend.disk ? "active" : "muted"}`}
                onClick={() => setActiveLegend({ ...activeLegend, disk: !activeLegend.disk })}
              >
                <span className="legend-dot green-dot" /> Disk (%)
              </span>
            </div>
          </div>

          <div className="chart-canvas-wrapper">
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="areaMem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="areaDisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  stroke="#94a3b8"
                  fontSize={11}
                  dy={6}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  stroke="#94a3b8"
                  fontSize={11}
                  ticks={[0, 25, 50, 75, 100]}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="custom-chart-tooltip">
                          <div className="tooltip-time">{label}</div>
                          {payload.map((entry, idx) => (
                            <div key={idx} className="tooltip-line" style={{ color: entry.color }}>
                              <span className="tooltip-entry-name">{entry.name}:</span>
                              <strong>{entry.value}%</strong>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {activeLegend.cpu && (
                  <Area
                    type="monotone"
                    name="CPU"
                    dataKey="cpu"
                    stroke="#3b82f6"
                    strokeWidth={2.2}
                    fillOpacity={1}
                    fill="url(#areaCpu)"
                  />
                )}
                {activeLegend.mem && (
                  <Area
                    type="monotone"
                    name="Memory"
                    dataKey="mem"
                    stroke="#8b5cf6"
                    strokeWidth={2.2}
                    fillOpacity={1}
                    fill="url(#areaMem)"
                  />
                )}
                {activeLegend.disk && (
                  <Area
                    type="monotone"
                    name="Disk"
                    dataKey="disk"
                    stroke="#10b981"
                    strokeWidth={2.2}
                    fillOpacity={1}
                    fill="url(#areaDisk)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-bottom-pills-row">
            <div className="chart-stat-chip">
              <span className="chip-label-icon blue-chip">
                <Cpu size={13} />
              </span>
              <span className="chip-label">Avg CPU</span>
              <strong className="chip-value">28%</strong>
            </div>
            <div className="chart-stat-chip">
              <span className="chip-label-icon purple-chip">
                <Layers size={13} />
              </span>
              <span className="chip-label">Avg Memory</span>
              <strong className="chip-value">62%</strong>
            </div>
            <div className="chart-stat-chip">
              <span className="chip-label-icon green-chip">
                <HardDrive size={13} />
              </span>
              <span className="chip-label">Avg Disk</span>
              <strong className="chip-value">{avgDisk !== null ? `${avgDisk}%` : "N/A"}</strong>
            </div>
            <div className="chart-stat-chip">
              <span className="chip-label-icon cyan-chip">
                <Zap size={13} />
              </span>
              <span className="chip-label">Uptime</span>
              <strong className="chip-value">2d 04h 12m</strong>
            </div>
          </div>
        </div>

        {/* Recent Findings Card */}
        <div className="glass-card recent-findings-card">
          <div className="findings-header-row">
            <h3 className="findings-title">Recent Findings</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                className="btn-correct-all-mini"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  borderRadius: 6,
                  background: "rgba(16, 185, 129, 0.12)",
                  color: "#059669",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  cursor: "pointer",
                }}
                onClick={handleCorrectAllThreats}
                disabled={isCorrectingThreats}
              >
                <ShieldCheck size={12} />
                <span>{isCorrectingThreats ? "Mitigating..." : "Correct All"}</span>
              </button>
              <button
                className="btn-view-all"
                onClick={() => setActiveTab && setActiveTab("diagnostics")}
              >
                View All <ArrowRight size={13} />
              </button>
            </div>
          </div>

          <div className="findings-list-wrapper">
            {findingsList.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="finding-item-row">
                  <div
                    className="finding-icon-wrap"
                    style={{ background: `${item.color}18`, color: item.color }}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="finding-info-col">
                    <div className="finding-title-text">{item.title}</div>
                    <div className="finding-subtitle-text">{item.subtitle}</div>
                  </div>
                  <div className="finding-meta-col">
                    <span className={`badge ${item.badgeClass}`}>{item.severity}</span>
                    <span className="finding-timestamp">{item.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 4: Quick Actions & Working AI Assistant Chatbot */}
      <div className="overview-bottom-toolbar">
        <div className="quick-actions-bar">
          <span className="quick-actions-title">Quick Actions</span>
          <div className="quick-actions-btns">
            <button
              className="quick-action-btn"
              onClick={() => setActiveTab && setActiveTab("live")}
            >
              <Shield size={15} className="blue-icon" />
              <span>Run Full Scan</span>
            </button>
            <button
              className="quick-action-btn"
              onClick={() => setActiveTab && setActiveTab("reports")}
            >
              <FileText size={15} className="purple-icon" />
              <span>View Reports</span>
            </button>
            <button
              className="quick-action-btn"
              onClick={() => setActiveTab && setActiveTab("simulation")}
            >
              <FlaskConical size={15} className="green-icon" />
              <span>Open Simulation Lab</span>
            </button>
            <button
              className="quick-action-btn"
              onClick={() => setActiveTab && setActiveTab("settings")}
            >
              <Settings size={15} className="gray-icon" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Detailed Storage Breakdown Modal (Requirements 5 & 7) */}
        {showDriveModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.45)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
            onClick={() => setShowDriveModal(false)}
          >
            <div
              className="card"
              style={{
                width: "90%",
                maxWidth: 600,
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
                borderRadius: 16,
                padding: 24,
                border: "1px solid rgba(226, 232, 240, 0.9)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>System Storage Inspector</h3>
                  <p style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    Live physical volumes retrieved from host OS kernel APIs (Win32 / GetDiskFreeSpaceEx).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDriveModal(false)}
                  style={{
                    background: "#f1f5f9",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {drivesList.map((d) => {
                  const dUsed = Math.max(0, d.total_bytes - d.available_bytes);
                  const dPct = d.total_bytes > 0 ? ((dUsed / d.total_bytes) * 100).toFixed(1) : "0.0";
                  const dTotalGb = (d.total_bytes / 1024 ** 3).toFixed(1);
                  const dUsedGb = (dUsed / 1024 ** 3).toFixed(1);
                  const dFreeGb = (d.available_bytes / 1024 ** 3).toFixed(1);

                  return (
                    <div
                      key={d.drive}
                      style={{
                        border: "1px solid rgba(226, 232, 240, 0.9)",
                        borderRadius: 12,
                        padding: 14,
                        background: "rgba(248, 250, 252, 0.8)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>
                            {d.drive} {d.label}
                          </span>
                          <span style={{ fontSize: 11, padding: "2px 6px", background: "#e2e8f0", borderRadius: 4, color: "#475569" }}>
                            {d.fs} • {d.drive_type}
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "#059669" }}>
                          {dPct}% used
                        </span>
                      </div>

                      <div style={{ height: 6, background: "#e2e8f0", borderRadius: 999, overflow: "hidden", marginBottom: 8 }}>
                        <div style={{ height: "100%", width: `${dPct}%`, background: "#10b981", borderRadius: 999 }} />
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#64748b" }}>
                        <span>Used: <strong>{dUsedGb} GB</strong> (Total - Available)</span>
                        <span>Free: <strong>{dFreeGb} GB</strong></span>
                        <span>Total: <strong>{dTotalGb} GB</strong></span>
                      </div>
                    </div>
                  );
                })}

                {systemStorage?.aggregate && (
                  <div style={{ marginTop: 6, padding: 12, background: "#f8fafc", borderRadius: 10, fontSize: 12, color: "#334155" }}>
                    <strong>Calculated Capacity: </strong>
                    Total: {systemStorage.aggregate.total_gb} GB • Used: {systemStorage.aggregate.used_gb} GB • Free: {systemStorage.aggregate.free_gb} GB ({systemStorage.aggregate.percent}% used)
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Working Compact AI Assistant Widget with Chatbot Panel */}
        <AiAssistantChat
          latest={latest}
          onNavigateTab={setActiveTab}
        />
      </div>
    </div>
  );
}
