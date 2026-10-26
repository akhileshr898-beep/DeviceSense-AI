import React, { useState, useEffect, useCallback } from "react";
import Navbar from "./components/Navbar";
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
  const [samplesHistory, setSamplesHistory] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [agentStatus, setAgentStatus] = useState("disconnected");
  const [selectedAction, setSelectedAction] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [latestRes, historyRes, diagRes] = await Promise.all([
        api.getLatestMetrics().catch(() => null),
        api.getMetricHistory(40, 15).catch(() => ({ samples: [] })),
        api.getDiagnostics("all").catch(() => ({ diagnostics: [] })),
      ]);

      if (latestRes) {
        setLatestMetrics(latestRes);
        setAgentStatus(latestRes.agent_status || "disconnected");
      } else {
        setAgentStatus("disconnected");
      }

      if (historyRes?.samples) {
        setSamplesHistory(historyRes.samples);
      }

      if (diagRes?.diagnostics) {
        setDiagnostics(diagRes.diagnostics);
      }
    } catch (err) {
      console.error("Dashboard polling error:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 2500);
    return () => clearInterval(timer);
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
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        agentStatus={agentStatus}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
      />

      <main className="main-content">
        {activeTab === "overview" && (
          <Overview
            latest={latestMetrics}
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

        {activeTab === "actions" && (
          <ActionsVerification />
        )}

        {activeTab === "reports" && (
          <Reports />
        )}

        {activeTab === "settings" && (
          <SimulationSettings
            onSimulationTriggered={fetchData}
          />
        )}
      </main>

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
