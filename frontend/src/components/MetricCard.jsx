import React from "react";

export default function MetricCard({
  title,
  value,
  subtext,
  icon: Icon,
  percent = null,
  color = "blue",
  badge = null,
}) {
  const colorMap = {
    blue: { fill: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", text: "#60a5fa" },
    emerald: { fill: "#10b981", bg: "rgba(16, 185, 129, 0.15)", text: "#34d399" },
    amber: { fill: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", text: "#fbbf24" },
    rose: { fill: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", text: "#f87171" },
    purple: { fill: "#8b5cf6", bg: "rgba(139, 92, 246, 0.15)", text: "#a78bfa" },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          {Icon && <Icon size={18} style={{ color: scheme.text }} />}
          {title}
        </span>
        {badge && (
          <span className={`badge ${badge.type ? `badge-${badge.type}` : "badge-info"}`}>
            {badge.label}
          </span>
        )}
      </div>

      <div className="card-value">{value}</div>
      {subtext && <div className="card-subtext">{subtext}</div>}

      {percent !== null && (
        <div className="progress-bar-bg">
          <div
            className="progress-bar-fill"
            style={{
              width: `${Math.min(Math.max(percent, 0), 100)}%`,
              backgroundColor: scheme.fill,
            }}
          />
        </div>
      )}
    </div>
  );
}
