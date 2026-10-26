import React, { useState, useEffect, useCallback } from "react";
import { FileText, Copy, Download, Check } from "lucide-react";
import { api } from "../services/api";

export default function Reports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadReport = useCallback(async () => {
    try {
      const data = await api.getTechnicianReport();
      setReport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await loadReport();
    };
    run();
  }, [loadReport]);

  const handleCopyMarkdown = () => {
    if (report?.markdown) {
      navigator.clipboard.writeText(report.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `devicesense_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>Generating report...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Technician Diagnostic Export</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Standardized technical audit log ready for IT support handover and issue tracking.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-secondary" onClick={handleCopyMarkdown}>
            {copied ? <Check size={14} style={{ color: "var(--accent-green)" }} /> : <Copy size={14} />}
            {copied ? "Copied Markdown!" : "Copy Markdown"}
          </button>
          <button className="btn-primary" onClick={handleDownloadJSON}>
            <Download size={14} /> Download JSON
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid-4">
        <div className="card">
          <div className="card-subtext">TOTAL DIAGNOSTICS</div>
          <div className="card-value" style={{ marginTop: 6 }}>
            {report?.summary_counts?.total_diagnostics || 0}
          </div>
        </div>
        <div className="card">
          <div className="card-subtext">ACTIVE WARNINGS</div>
          <div className="card-value" style={{ marginTop: 6, color: "var(--accent-yellow)" }}>
            {report?.summary_counts?.active_warnings || 0}
          </div>
        </div>
        <div className="card">
          <div className="card-subtext">ACTIVE CRITICAL</div>
          <div className="card-value" style={{ marginTop: 6, color: "var(--accent-red)" }}>
            {report?.summary_counts?.active_critical || 0}
          </div>
        </div>
        <div className="card">
          <div className="card-subtext">EXECUTED ACTIONS</div>
          <div className="card-value" style={{ marginTop: 6, color: "var(--accent-green)" }}>
            {report?.summary_counts?.executed_actions || 0}
          </div>
        </div>
      </div>

      {/* Markdown Preview */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <FileText size={16} /> Markdown Export Preview
          </span>
          <span className="card-subtext">Generated {report?.generated_at?.substring(0, 19)}</span>
        </div>
        <pre
          style={{
            background: "var(--bg-secondary)",
            padding: 18,
            borderRadius: 8,
            fontSize: 12.5,
            lineHeight: 1.6,
            color: "var(--text-main)",
            whiteSpace: "pre-wrap",
            overflowX: "auto",
            maxHeight: 450,
          }}
        >
          {report?.markdown || "No report content generated."}
        </pre>
      </div>
    </div>
  );
}

