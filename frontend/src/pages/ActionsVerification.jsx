import React, { useState, useEffect } from "react";
import { ShieldCheck, CheckCircle2, History, AlertCircle } from "lucide-react";
import VerificationCard from "../components/VerificationCard";
import { api } from "../services/api";

export default function ActionsVerification() {
  const [actionHistory, setActionHistory] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.getActionHistory();
      const events = res.events || [];
      setActionHistory(events);

      // Extract all verifications
      const allVerifs = [];
      events.forEach((evt) => {
        if (evt.verifications) {
          allVerifs.push(...evt.verifications);
        }
      });
      setVerifications(allVerifs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Safe Fixes & Verification Engine</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Strict allowlist policy: baseline observation → user approval → safe execution → before-and-after outcome measurement.
        </p>
      </div>

      {/* Safety Policy Overview */}
      <div className="grid-3">
        <div className="card" style={{ borderLeft: "4px solid var(--accent-blue)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-blue)", marginBottom: 4 }}>
            LEVEL 1 — INFORMATIONAL
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>
            Read-only Diagnostics
          </div>
          <p style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.4 }}>
            Inspect thread counters, analyze disk allocation, run loopback ping checks. Zero system mutation.
          </p>
        </div>

        <div className="card" style={{ borderLeft: "4px solid var(--accent-green)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-green)", marginBottom: 4 }}>
            LEVEL 2 — USER APPROVED
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>
            Controlled System Corrections
          </div>
          <p style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.4 }}>
            Trim process working set, clear user %TEMP% cache, flush DNS cache, open Windows native settings.
          </p>
        </div>

        <div className="card" style={{ borderLeft: "4px solid var(--accent-red)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-red)", marginBottom: 4 }}>
            LEVEL 3 — EXCLUDED POLICY
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>
            Strictly Prohibited
          </div>
          <p style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.4 }}>
            Registry edits, driver uninstallations, arbitrary PowerShell strings, and claims of hardware repair are blocked.
          </p>
        </div>
      </div>

      {/* Verification Outcomes */}
      <div>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>
          Verification Results ({verifications.length})
        </h3>
        {verifications.length === 0 ? (
          <div
            className="card"
            style={{ padding: 32, textAlign: "center", color: "var(--text-dim)" }}
          >
            No verification audits recorded yet. Approve a recommended action to trigger measurement.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {verifications.map((v) => (
              <VerificationCard key={v.id} verification={v} />
            ))}
          </div>
        )}
      </div>

      {/* Action Audit Trail */}
      <div>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <History size={18} />
          Action Audit History ({actionHistory.length})
        </h3>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 140 }}>Timestamp</th>
                <th>Action Recommendation</th>
                <th style={{ width: 140 }}>Risk Level</th>
                <th style={{ width: 120 }}>Status</th>
                <th>Execution Summary</th>
              </tr>
            </thead>
            <tbody>
              {actionHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--text-dim)" }}>
                    No actions have been executed in this session.
                  </td>
                </tr>
              ) : (
                actionHistory.map((evt) => (
                  <tr key={evt.id}>
                    <td style={{ fontSize: 12, color: "var(--text-dim)" }}>
                      {evt.approved_at ? evt.approved_at.substring(11, 19) : "—"}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {evt.recommendation_title || evt.recommendation_id}
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: 10 }}>
                        {evt.risk_level || "level_2"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          evt.status === "completed"
                            ? "badge-success"
                            : evt.status === "rejected"
                            ? "badge-critical"
                            : "badge-warning"
                        }`}
                      >
                        {evt.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                      {evt.outcome_summary || evt.rejection_reason || "Completed"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
