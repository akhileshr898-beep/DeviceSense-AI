import React, { useState, useEffect } from "react";
import {
  Search,
  Laptop,
  ChevronDown,
  Bell,
  RefreshCw,
} from "lucide-react";

export default function TopHeader({
  deviceHostname = "Akhilesh's PC",
  agentStatus = "connected",
  onRefresh,
  isRefreshing,
}) {
  const [currentTime, setCurrentTime] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      setCurrentTime(`${dateStr} | ${timeStr}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="app-top-header">
      {/* Search Bar */}
      <div className="header-search-wrapper">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search anything..."
          className="header-search-input"
        />
      </div>

      {/* Header Right Actions */}
      <div className="header-right-actions">
        {/* Device Selector Pill */}
        <div className="header-pill device-pill">
          <Laptop size={15} className="pill-icon" />
          <span className="pill-text">{deviceHostname || "Akhilesh's PC"}</span>
          <ChevronDown size={14} className="pill-chevron" />
        </div>

        {/* Monitoring Active Pill */}
        <div className="header-pill status-pill">
          <span className={`pill-status-dot ${agentStatus}`} />
          <span className="pill-text">Monitoring Active</span>
          <ChevronDown size={14} className="pill-chevron" />
        </div>

        {/* Quick Refresh Button */}
        {onRefresh && (
          <button
            className="header-icon-btn refresh-btn"
            onClick={onRefresh}
            title="Refresh Metrics"
          >
            <RefreshCw size={16} className={isRefreshing ? "spin-animation" : ""} />
          </button>
        )}

        {/* Notifications Bell */}
        <div className="notification-wrapper">
          <button
            className="header-icon-btn bell-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
          >
            <Bell size={17} />
            <span className="notification-badge">2</span>
          </button>

          {showNotifications && (
            <div className="notifications-dropdown">
              <div className="notif-header">
                <strong>Notifications</strong>
                <span className="badge badge-info">2 New</span>
              </div>
              <div className="notif-item">
                <span className="notif-dot warning" />
                <div>
                  <div className="notif-title">High memory pressure</div>
                  <div className="notif-time">2 mins ago</div>
                </div>
              </div>
              <div className="notif-item">
                <span className="notif-dot success" />
                <div>
                  <div className="notif-title">Windows background health verified</div>
                  <div className="notif-time">15 mins ago</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="user-avatar" title="Akhilesh Rai">
          <span>A</span>
        </div>

        {/* Date & Time */}
        <div className="header-clock">{currentTime || "Mon, 26 Oct 2026 | 11:35 AM"}</div>
      </div>
    </header>
  );
}
