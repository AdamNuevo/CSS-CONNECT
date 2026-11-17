import { useState, useEffect } from "react";
import Icon from "../../components/Icon.jsx";
import { api } from "../../api.js";

const TABS = ["Pending", "Approved", "Rejected"];

export default function DeanApprovals() {
  const [tab, setTab] = useState("Pending");
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState(null);

  const fetchApprovals = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api(`/dean/approvals?status=${tab}`);
      setApprovals(res || []);
    } catch (err) {
      setError(err.message || "Failed to load approvals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [tab]);

  const handleDecision = async (id, action) => {
    const confirmMsg = action === "approve"
      ? "Are you sure you want to approve this request?"
      : "Are you sure you want to reject this request?";
    if (!window.confirm(confirmMsg)) return;

    setActionBusy(id);
    try {
      await api(`/dean/approvals/${id}`, {
        method: "PATCH",
        body: { action }
      });
      fetchApprovals();
    } catch (err) {
      alert(err.message || "Failed to update approval.");
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="page-title">Approvals</h2>
          <p className="lead">Approve departmental requests</p>
        </div>
      </div>

      {error && (
        <div className="form-error" role="alert">
          <Icon name="alert" /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
            style={{
              border: 0,
              background: tab === t ? "#fff" : "transparent",
              color: tab === t ? "var(--primary)" : "var(--muted)",
              fontWeight: tab === t ? 600 : 500,
              padding: "8px 18px",
              borderRadius: 8,
              cursor: "pointer",
              boxShadow: tab === t ? "var(--shadow)" : "none",
              fontSize: 14
            }}
          >
            {t} {t === "Pending" && approvals.length > 0 && `(${approvals.length})`}
          </button>
        ))}
      </div>

      {/* Approvals list card */}
      <div className="card flush">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
            Loading requests…
          </div>
        ) : approvals.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
            No {tab.toLowerCase()} requests found.
          </div>
        ) : (
          <div>
            {approvals.map((req) => (
              <div
                key={req.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "20px 24px",
                  borderBottom: "1px solid var(--border)"
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        background: "#e8eaf4",
                        color: "var(--primary)",
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "2px 10px",
                        borderRadius: 999
                      }}
                    >
                      {req.type}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>{req.submitted_by}</span>
                  </div>

                  <strong style={{ fontSize: 16, color: "var(--text)" }}>{req.title}</strong>

                  <span style={{ fontSize: 13, color: "var(--muted)" }}>
                    {req.details || `Submitted on ${req.submitted_at || "recently"}`}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {tab === "Pending" ? (
                    <>
                      <button
                        className="btn danger"
                        disabled={actionBusy === req.id}
                        onClick={() => handleDecision(req.id, "reject")}
                      >
                        Reject
                      </button>
                      <button
                        className="btn primary"
                        disabled={actionBusy === req.id}
                        onClick={() => handleDecision(req.id, "approve")}
                      >
                        Approve
                      </button>
                    </>
                  ) : (
                    <span className={"badge " + (req.status === "Approved" ? "ok" : "bad")}>
                      {req.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
