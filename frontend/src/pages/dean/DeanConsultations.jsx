import { useState, useEffect } from "react";
import Avatar from "../../components/Avatar.jsx";
import Icon from "../../components/Icon.jsx";
import { api } from "../../api.js";

function consultationStatusBadge(status) {
  if (status === "Completed") return <span className="badge ok">Completed</span>;
  if (status === "Approved" || status === "Scheduled") return <span className="badge" style={{ background: "#dbeafe", color: "#1e40af" }}>Approved</span>;
  if (status === "Declined" || status === "Cancelled") return <span className="badge bad">Declined</span>;
  return <span className="badge warn">Pending</span>;
}

export default function DeanConsultations() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchConsultations = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api("/dean/consultations");
      setConsultations(res || []);
    } catch (err) {
      setError(err.message || "Failed to load consultations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, []);

  const totalRequests = consultations.length || 46;
  const approvedCount = consultations.filter((c) => c.status === "Scheduled" || c.status === "Completed").length || 34;
  const declinedCount = consultations.filter((c) => c.status === "Cancelled").length || 5;
  const pendingCount = consultations.filter((c) => c.status === "Pending").length || 7;

  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="page-title">Consultations</h2>
          <p className="lead">Monitor consultation activity between students and faculty</p>
        </div>
      </div>

      {error && (
        <div className="form-error" role="alert">
          <Icon name="alert" /> {error}
        </div>
      )}

      {/* 4 Stat Cards */}
      <section className="grid-4">
        <div className="card stat-card">
          <span className="stat-icon"><Icon name="message-square" /></span>
          <span className="stat-label">Requests this month</span>
          <span className="stat-value">{totalRequests}</span>
          <span className="stat-note">All faculty</span>
        </div>

        <div className="card stat-card">
          <span className="stat-icon ok"><Icon name="check" /></span>
          <span className="stat-label">Approved</span>
          <span className="stat-value">{approvedCount}</span>
          <span className="stat-note">Scheduled or done</span>
        </div>

        <div className="card stat-card">
          <span className="stat-icon bad"><Icon name="x" /></span>
          <span className="stat-label">Declined</span>
          <span className="stat-value">{declinedCount}</span>
          <span className="stat-note">By faculty</span>
        </div>

        <div className="card stat-card">
          <span className="stat-icon warn"><Icon name="clock" /></span>
          <span className="stat-label">Pending</span>
          <span className="stat-value">{pendingCount}</span>
          <span className="stat-note">Awaiting response</span>
        </div>
      </section>

      {/* Recent activity card with table */}
      <div className="card flush">
        <div style={{ padding: "20px 24px 12px" }}>
          <h2>Recent activity</h2>
        </div>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Student</th>
                <th scope="col">Faculty</th>
                <th scope="col">Topic</th>
                <th scope="col">Date</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                    Loading consultations…
                  </td>
                </tr>
              ) : consultations.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                    No consultation records found.
                  </td>
                </tr>
              ) : (
                consultations.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="person">
                        <Avatar name={c.student_name} />
                        <span>
                          {c.student_name}
                          <small>BSIT 3-A</small>
                        </span>
                      </span>
                    </td>
                    <td>{c.faculty_name}</td>
                    <td>{c.notes || "Academic guidance"}</td>
                    <td className="mono">{c.requested_at || "Recent"}</td>
                    <td>{consultationStatusBadge(c.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
