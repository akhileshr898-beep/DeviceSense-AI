import React, { useState, useEffect, useCallback } from "react";
import WorkspaceCanvas from "./components/3d/WorkspaceCanvas";
import Sidebar from "./components/Sidebar";
import TopHeader from "./components/TopHeader";
import Overview from "./pages/Overview";
import LiveMonitor from "./pages/LiveMonitor";
import ProcessInvestigator from "./pages/ProcessInvestigator";
import Diagnostics from "./pages/Diagnostics";
import ActionsVerification from "./pages/ActionsVerification";
import Reports from "./pages/Reports";
import SimulationSettings from "./pages/SimulationSettings";
import ActionApprovalModal from "./components/ActionApprovalModal";
import { api } from "./services/api";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [latestMetrics, setLatestMetrics] = useState(null);
  const [storageData, setStorageData] = useState(null);
  const [samplesHistory, setSamplesHistory] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [agentStatus, setAgentStatus] = useState("connected");
  const [selectedAction, setSelectedAction] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [latestRes, historyRes, diagRes, storageRes] = await Promise.all([
        api.getLatestMetrics().catch(() => null),
        api.getMetricHistory(40, 15).catch(() => ({ samples: [] })),
        api.getDiagnostics("all").catch(() => ({ diagnostics: [] })),
        api.getStorage().catch(() => null),
      ]);

      if (latestRes) {
        setLatestMetrics(latestRes);
        setAgentStatus(latestRes.agent_status || "connected");
      }

      if (storageRes?.drives) {
        setStorageData(storageRes);
      } else if (latestRes?.storage) {
        setStorageData(latestRes.storage);
      }

      if (historyRes?.samples && historyRes.samples.length > 0) {
        setSamplesHistory(historyRes.samples);
      }

      if (diagRes?.diagnostics && diagRes.diagnostics.length > 0) {
        setDiagnostics(diagRes.diagnostics);
      }
    } catch (err) {
      console.error("Dashboard polling error:", err);
    }
  }, []);

  useEffect(() => {
    let timer;
    const run = async () => {
      await fetchData();
      timer = setInterval(fetchData, 2500);
    };
    run();
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [fetchData]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleDismissDiagnostic = async (diagId) => {
    try {
      await api.dismissDiagnostic(diagId);
      await fetchData();
    } catch (err) {
      alert(`Could not dismiss: ${err.message}`);
    }
  };

  const handleApproveAction = async (actionId) => {
    await api.approveAction(actionId);
    await fetchData();
  };

  const handleRejectAction = async (actionId, reason) => {
    await api.rejectAction(actionId, reason);
    await fetchData();
  };

  return (
    <div className="app-glass-layout">
      {/* 3D Realistic Workspace Computer in Background */}
      <WorkspaceCanvas />

      {/* Ambient Backdrop Canvas Layer */}
      <div className="ambient-backdrop" />

      {/* Left Glass Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        agentStatus={agentStatus}
      />

      {/* Main Content Area */}
      <div className="app-main-viewport">
        {/* Top Header */}
        <TopHeader
          deviceHostname={latestMetrics?.sample?.hostname || "Akhilesh's PC"}
          agentStatus={agentStatus}
          onRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Dynamic Page Views */}
        <main className="viewport-content-container">
          {activeTab === "overview" && (
            <Overview
              latest={latestMetrics}
              storageData={storageData}
              samplesHistory={samplesHistory}
              diagnostics={diagnostics}
              onSelectAction={setSelectedAction}
              onDismiss={handleDismissDiagnostic}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === "live" && (
            <LiveMonitor
              samples={samplesHistory}
              latest={latestMetrics}
            />
          )}

          {activeTab === "processes" && (
            <ProcessInvestigator
              onInspectProcess={setSelectedAction}
            />
          )}

          {activeTab === "diagnostics" && (
            <Diagnostics
              diagnostics={diagnostics}
              onSelectAction={setSelectedAction}
              onDismiss={handleDismissDiagnostic}
            />
          )}

          {(activeTab === "actions" || activeTab === "audit") && (
            <ActionsVerification />
          )}

          {activeTab === "reports" && (
            <Reports />
          )}

          {(activeTab === "simulation" || activeTab === "settings") && (
            <SimulationSettings
              onSimulationTriggered={fetchData}
            />
          )}
        </main>
      </div>

      {/* Action Approval & Risk Modal */}
      <ActionApprovalModal
        action={selectedAction}
        isOpen={Boolean(selectedAction)}
        onClose={() => setSelectedAction(null)}
        onApprove={handleApproveAction}
        onReject={handleRejectAction}
      />
    </div>
  );
}
