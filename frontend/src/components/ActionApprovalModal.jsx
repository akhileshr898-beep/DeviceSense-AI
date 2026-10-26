import React, { useState } from "react";
import { ShieldCheck, AlertCircle, ArrowLeft, CheckCircle, XCircle } from "lucide-react";

export default function ActionApprovalModal({ action, isOpen, onClose, onApprove, onReject }) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !action) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(action.id);
      onClose();
    } catch (err) {
      alert(`Approval execution failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason) {
      setShowRejectInput(true);
      return;
    }
    setIsSubmitting(true);
    try {
      await onReject(action.id, rejectReason);
      onClose();
    } catch (err) {
      alert(`Rejection failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "var(--accent-blue-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-blue)",
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Action Authorization Request</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              DeviceSense AI requires explicit consent before executing any corrective action.
            </p>
          </div>
        </div>

        <div style={{ background: "var(--bg-secondary)", padding: 16, borderRadius: 10, marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-main)", marginBottom: 6 }}>
            {action.title}
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 12 }}>
            {action.description}
          </p>

          <div className="grid-2" style={{ gap: 10, fontSize: 12.5 }}>
            <div>
              <span style={{ color: "var(--text-dim)" }}>Action Type:</span>{" "}
              <code>{action.action_type}</code>
            </div>
            <div>
              <span style={{ color: "var(--text-dim)" }}>Safety Level:</span>{" "}
              <span className="badge badge-info">{action.risk_level}</span>
            </div>
            <div>
              <span style={{ color: "var(--text-dim)" }}>Target:</span>{" "}
              <span style={{ fontWeight: 500 }}>{action.target_resource || "Local System"}</span>
            </div>
            <div>
              <span style={{ color: "var(--text-dim)" }}>Expected Benefit:</span>{" "}
              <span style={{ color: "var(--accent-green)", fontWeight: 500 }}>
                {action.expected_benefit}
              </span>
            </div>
          </div>
        </div>

        {/* Undo & Safety Notice */}
        <div
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 20,
            fontSize: 12.5,
            color: "var(--text-muted)",
          }}
        >
          <strong style={{ color: "var(--accent-yellow)" }}>Undo & Safety Guarantee:</strong>{" "}
          {action.undo_guidance || "Safe non-destructive procedure. No arbitrary registry edits or driver removal."}
        </div>

        {showRejectInput && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
              Reason for rejection (logged for audit):
            </label>
            <input
              type="text"
              style={{ width: "100%" }}
              placeholder="e.g. Work in progress, prefer to inspect manually"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
        )}

        {/* Modal Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn-danger"
              onClick={handleReject}
              disabled={isSubmitting}
            >
              <XCircle size={15} /> Reject
            </button>
            <button
              className="btn-primary"
              onClick={handleApprove}
              disabled={isSubmitting}
              style={{ background: "var(--accent-green)" }}
            >
              <CheckCircle size={15} /> {isSubmitting ? "Executing & Verifying..." : "Approve & Execute"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
