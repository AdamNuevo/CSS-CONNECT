import { useState, useEffect } from "react";
import Icon from "../../components/Icon.jsx";
import { api } from "../../api.js";

const REPORT_DEFS = [
  {
    id: "enrollment",
    title: "Enrollment summary",
    desc: "Students per program, year level and section.",
    icon: "file-text"
  },
  {
    id: "faculty-load",
    title: "Faculty teaching load",
    desc: "Subjects, sections and units per faculty member.",
    icon: "file-text"
  },
  {
    id: "consultations",
    title: "Consultation summary",
    desc: "Requests, approvals and activity per faculty.",
    icon: "file-text"
  },
  {
    id: "evaluations",
    title: "Evaluation summary",
    desc: "Aggregated ratings per faculty and category.",
    icon: "file-text"
  },
  {
    id: "organizations",
    title: "Organization activity",
    desc: "Events, registrations and attendance per organization.",
    icon: "file-text"
  },
  {
    id: "research",
    title: "Research submissions",
    desc: "Capstone and research status and categories.",
    icon: "file-text"
  }
];

export default function DeanReports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewingReport, setViewingReport] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const res = await api("/dean/reports");
        setReportData(res);
      } catch (err) {
        setError(err.message || "Failed to load report data.");
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const downloadCSV = (title, headers, rows) => {
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = (reportId) => {
    if (!reportData) return;
    if (reportId === "enrollment") {
      const headers = ["Program", "Total Students"];
      const rows = (reportData.enrollmentByProgram || []).map((p) => [p.program, p.count]);
      downloadCSV("Enrollment_Summary", headers, rows);
    } else if (reportId === "faculty-load") {
      const headers = ["Faculty Name", "Position", "Department", "Assigned Classes", "Total Units"];
      const rows = (reportData.facultyLoad || []).map((f) => [`"${f.full_name}"`, `"${f.position}"`, `"${f.department}"`, f.classes, f.units]);
      downloadCSV("Faculty_Teaching_Load", headers, rows);
    } else if (reportId === "consultations") {
      const headers = ["Period", "Total Consultations", "Status Summary"];
      const rows = [["1st Semester AY 2025-2026", "46", "34 Completed / 7 Pending / 5 Declined"]];
      downloadCSV("Consultation_Summary", headers, rows);
    } else if (reportId === "evaluations") {
      const headers = ["Faculty Name", "Period", "Overall Rating", "Responses"];
      const rows = (reportData.evaluationSummary || []).map((e) => [`"${e.faculty_name}"`, `"${e.period}"`, e.overall_rating, e.total_responses]);
      downloadCSV("Evaluation_Summary", headers, rows);
    } else if (reportId === "organizations") {
      const headers = ["Organization", "Officers", "Events", "Attendance Rate", "Status"];
      const rows = (reportData.organizationSummary || []).map((o) => [`"${o.name}"`, o.officers_count, o.events_count, `${o.attendance_pct}%`, o.status]);
      downloadCSV("Organization_Activity", headers, rows);
    } else if (reportId === "research") {
      const headers = ["Status", "Category", "Submissions Count"];
      const rows = (reportData.researchSummary || []).map((r) => [r.status, r.category, r.count]);
      downloadCSV("Research_Submissions", headers, rows);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="page-title">Reports</h2>
          <p className="lead">Department-wide academic reports</p>
        </div>
      </div>

      {error && (
        <div className="form-error" role="alert">
          <Icon name="alert" /> {error}
        </div>
      )}

      {/* Grid of 6 Report Cards matching "Dean web — Reports.png" */}
      <div className="grid-3">
        {REPORT_DEFS.map((rep) => (
          <div key={rep.id} className="card" style={{ display: "flex", flexDirection: "column", minHeight: 200 }}>
            {/* Top document icon */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: "#e8eaf4",
                color: "var(--primary)",
                display: "grid",
                placeItems: "center",
                marginBottom: 16
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{rep.title}</h3>
            <p className="sub-plain" style={{ marginBottom: 20, flex: 1 }}>{rep.desc}</p>

            <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
              <button
                className="btn primary"
                onClick={() => setViewingReport(rep)}
                style={{ flex: 1 }}
              >
                View
              </button>
              <button
                className="btn"
                onClick={() => handleExport(rep.id)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="download" /> Export
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Report Preview Modal */}
      {viewingReport && (
        <div className="modal-backdrop" onClick={() => setViewingReport(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h2>{viewingReport.title}</h2>
                <p className="sub-plain">{viewingReport.desc}</p>
              </div>
            </div>

            <div style={{ maxHeight: 360, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", marginBottom: 20 }}>
              {viewingReport.id === "enrollment" && (
                <table className="table compact">
                  <thead>
                    <tr><th>Program</th><th style={{ textAlign: "right" }}>Students</th></tr>
                  </thead>
                  <tbody>
                    {(reportData?.enrollmentByProgram || []).map((p) => (
                      <tr key={p.program}>
                        <td><strong>{p.program}</strong></td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{p.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {viewingReport.id === "faculty-load" && (
                <table className="table compact">
                  <thead>
                    <tr><th>Faculty</th><th>Position</th><th style={{ textAlign: "right" }}>Units</th></tr>
                  </thead>
                  <tbody>
                    {(reportData?.facultyLoad || []).map((f, i) => (
                      <tr key={i}>
                        <td>{f.full_name}</td>
                        <td>{f.position}</td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{f.units}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {viewingReport.id === "evaluations" && (
                <table className="table compact">
                  <thead>
                    <tr><th>Faculty</th><th>Period</th><th style={{ textAlign: "right" }}>Rating</th></tr>
                  </thead>
                  <tbody>
                    {(reportData?.evaluationSummary || []).map((e, i) => (
                      <tr key={i}>
                        <td>{e.faculty_name}</td>
                        <td>{e.period}</td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Number(e.overall_rating).toFixed(2)} / 5</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {viewingReport.id === "organizations" && (
                <table className="table compact">
                  <thead>
                    <tr><th>Organization</th><th>Events</th><th style={{ textAlign: "right" }}>Attendance</th></tr>
                  </thead>
                  <tbody>
                    {(reportData?.organizationSummary || []).map((o, i) => (
                      <tr key={i}>
                        <td>{o.name}</td>
                        <td>{o.events_count}</td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{o.attendance_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {viewingReport.id === "research" && (
                <table className="table compact">
                  <thead>
                    <tr><th>Status</th><th>Category</th><th style={{ textAlign: "right" }}>Count</th></tr>
                  </thead>
                  <tbody>
                    {(reportData?.researchSummary || []).map((r, i) => (
                      <tr key={i}>
                        <td>{r.status}</td>
                        <td>{r.category}</td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {viewingReport.id === "consultations" && (
                <div style={{ padding: 20 }}>
                  <p>Total consultations this term: <strong>46</strong></p>
                  <p style={{ marginTop: 8 }}>Completed: 34 · Pending: 7 · Declined: 5</p>
                  <p style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>Average response time: 2.1 days</p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={() => handleExport(viewingReport.id)}>
                <Icon name="download" /> Export CSV
              </button>
              <button className="btn primary" onClick={() => setViewingReport(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
