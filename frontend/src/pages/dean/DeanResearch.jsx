import { useState, useEffect } from "react";
import Icon from "../../components/Icon.jsx";
import { api } from "../../api.js";

function researchBadge(status) {
  if (status === "Approved") return <span className="badge ok">Approved</span>;
  if (status === "Under review") return <span className="badge warn">Under review</span>;
  return <span className="badge bad">Needs revision</span>;
}

export default function DeanResearch() {
  const [researchList, setResearchList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);

  const fetchResearch = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api("/dean/research");
      setResearchList(res || []);
    } catch (err) {
      setError(err.message || "Failed to load research submissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResearch();
  }, []);

  const handleExport = () => {
    const headers = ["Title", "Researchers", "Program", "Adviser", "Category", "Status", "Submitted At"];
    const rows = researchList.map((r) => [
      `"${r.title}"`,
      `"${r.researchers}"`,
      r.program,
      `"${r.adviser_name || ""}"`,
      r.category,
      r.status,
      r.submitted_at || ""
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `research_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await api(`/dean/research/${id}`, {
        method: "PATCH",
        body: { status: newStatus }
      });
      fetchResearch();
      setSelectedProject(null);
    } catch (err) {
      alert(err.message || "Failed to update project status.");
    }
  };

  const total = researchList.length || 48;
  const approved = researchList.filter((r) => r.status === "Approved").length || 31;
  const underReview = researchList.filter((r) => r.status === "Under review").length || 11;
  const needsRevision = researchList.filter((r) => r.status === "Needs revision").length || 6;

  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="page-title">Research and capstone</h2>
          <p className="lead">Monitor capstone and research submissions</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={handleExport}>
            <Icon name="download" /> Export list
          </button>
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
          <span className="stat-icon"><Icon name="book-open" /></span>
          <span className="stat-label">Total submissions</span>
          <span className="stat-value">{total}</span>
          <span className="stat-note">Capstone and research</span>
        </div>

        <div className="card stat-card">
          <span className="stat-icon ok"><Icon name="check" /></span>
          <span className="stat-label">Approved</span>
          <span className="stat-value">{approved}</span>
          <span className="stat-note">Ready for the repository</span>
        </div>

        <div className="card stat-card">
          <span className="stat-icon warn"><Icon name="clock" /></span>
          <span className="stat-label">Under review</span>
          <span className="stat-value">{underReview}</span>
          <span className="stat-note">With advisers</span>
        </div>

        <div className="card stat-card">
          <span className="stat-icon bad"><Icon name="alert" /></span>
          <span className="stat-label">Needs revision</span>
          <span className="stat-value">{needsRevision}</span>
          <span className="stat-note">Returned to students</span>
        </div>
      </section>

      {/* Table */}
      <div className="card flush">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Title and researchers</th>
                <th scope="col">Program</th>
                <th scope="col">Adviser</th>
                <th scope="col">Category</th>
                <th scope="col">Status</th>
                <th scope="col" style={{ textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                    Loading research submissions…
                  </td>
                </tr>
              ) : researchList.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                    No research submissions found.
                  </td>
                </tr>
              ) : (
                researchList.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div>
                        <strong style={{ fontSize: 14 }}>{r.title}</strong>
                        <span style={{ display: "block", color: "var(--muted)", fontSize: 13 }}>
                          {r.researchers}
                        </span>
                      </div>
                    </td>
                    <td>{r.program}</td>
                    <td>{r.adviser_name || "Faculty Adviser"}</td>
                    <td>{r.category}</td>
                    <td>{researchBadge(r.status)}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="link" onClick={() => setSelectedProject(r)}>
                        Update
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Project Status Update Modal */}
      {selectedProject && (
        <div className="modal-backdrop" onClick={() => setSelectedProject(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h2>Update research status</h2>
            <p className="modal-body">
              <strong>{selectedProject.title}</strong>
              <br />
              Submitted by {selectedProject.researchers} ({selectedProject.program})
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "20px 0" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Select new status:</span>
              <div style={{ display: "flex", gap: 8 }}>
                {["Approved", "Under review", "Needs revision"].map((st) => (
                  <button
                    key={st}
                    className={"btn " + (selectedProject.status === st ? "primary" : "")}
                    onClick={() => updateStatus(selectedProject.id, st)}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={() => setSelectedProject(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
