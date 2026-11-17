import { useState, useEffect } from "react";
import Avatar from "../../components/Avatar.jsx";
import Badge from "../../components/Badge.jsx";
import Icon from "../../components/Icon.jsx";
import { api } from "../../api.js";

const PROGRAMS = ["All programs", "BSIT", "BSCS", "BSIS"];
const YEARS = ["All years", "1", "2", "3", "4"];
const SECTIONS = ["All sections", "1-A", "1-B", "2-A", "2-B", "3-A", "3-B", "4-A", "4-B"];

function statusBadge(acad) {
  if (!acad) return <span className="badge ok">Regular</span>;
  const lower = acad.toLowerCase();
  if (lower.includes("irreg")) return <span className="badge warn">Irregular</span>;
  if (lower.includes("inc")) return <span className="badge idle">INC</span>;
  if (lower.includes("ow")) return <span className="badge idle">OW</span>;
  return <span className="badge ok">Regular</span>;
}

export default function DeanStudents() {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [program, setProgram] = useState("All programs");
  const [year, setYear] = useState("All years");
  const [section, setSection] = useState("All sections");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const fetchStudents = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", page);
      params.set("pageSize", pageSize);
      if (program !== "All programs") params.set("program", program);
      if (year !== "All years") params.set("year", year);
      if (section !== "All sections") params.set("section", section);

      const res = await api(`/dean/students?${params.toString()}`);
      setStudents(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [page, program, year, section]);

  const handleExport = () => {
    const headers = ["Student Number", "Name", "Email", "Program", "Year Level", "Section", "Academic Status"];
    const rows = students.map((s) => [
      s.no,
      `"${s.name}"`,
      s.email,
      s.program || "",
      s.year_level || "",
      s.section || "",
      s.acad || "Regular"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `students_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="page-title">Students</h2>
          <p className="lead">Student records across BSIT, BSCS and BSIS</p>
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

      <div className="card flush">
        {/* Filter bar */}
        <div className="filters" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="field-sm">
            <span>Program</span>
            <select
              className="select"
              value={program}
              onChange={(e) => {
                setProgram(e.target.value);
                setPage(1);
              }}
            >
              {PROGRAMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="field-sm">
            <span>Year level</span>
            <select
              className="select"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setPage(1);
              }}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y === "All years" ? y : `Year ${y}`}</option>
              ))}
            </select>
          </div>

          <div className="field-sm">
            <span>Section</span>
            <select
              className="select"
              value={section}
              onChange={(e) => {
                setSection(e.target.value);
                setPage(1);
              }}
            >
              {SECTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Student no.</th>
                <th scope="col">Name</th>
                <th scope="col">Program</th>
                <th scope="col">Year/Section</th>
                <th scope="col">Academic status</th>
                <th scope="col" style={{ textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                    Loading students…
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                    No students found matching your filters.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.no}>
                    <td className="mono" style={{ fontWeight: 500 }}>{s.no}</td>
                    <td>
                      <span className="person">
                        <Avatar name={s.name} photo={s.photo} />
                        <span>
                          {s.name}
                          <small>{s.acad || "Regular"}</small>
                        </span>
                      </span>
                    </td>
                    <td>{s.program || "—"}</td>
                    <td>{s.year_level ? `${s.year_level}-${s.section}` : s.section || "—"}</td>
                    <td>{statusBadge(s.acad)}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="link"
                        onClick={() => setSelectedStudent(s)}
                      >
                        View record
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer with pagination */}
        <div className="table-foot">
          <span>Showing {startIdx}–{endIdx} of {total} entries</span>
          <div className="pager">
            <button
              className="btn"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              className="btn"
              disabled={page * pageSize >= total || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Student record modal dialog */}
      {selectedStudent && (
        <div className="modal-backdrop" onClick={() => setSelectedStudent(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <Avatar name={selectedStudent.name} photo={selectedStudent.photo} />
              <div>
                <h2 style={{ fontSize: 18, marginBottom: 2 }}>{selectedStudent.name}</h2>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>{selectedStudent.no} · {selectedStudent.email}</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px", fontSize: 14 }}>
              <div>
                <span style={{ display: "block", color: "var(--muted)", fontSize: 12 }}>Program</span>
                <strong>{selectedStudent.program || "BSIT"}</strong>
              </div>
              <div>
                <span style={{ display: "block", color: "var(--muted)", fontSize: 12 }}>Year & Section</span>
                <strong>{selectedStudent.year_level ? `${selectedStudent.year_level}-${selectedStudent.section}` : selectedStudent.section || "—"}</strong>
              </div>
              <div>
                <span style={{ display: "block", color: "var(--muted)", fontSize: 12 }}>Academic Status</span>
                {statusBadge(selectedStudent.acad)}
              </div>
              <div>
                <span style={{ display: "block", color: "var(--muted)", fontSize: 12 }}>Account Status</span>
                <Badge status={selectedStudent.status} />
              </div>
              <div>
                <span style={{ display: "block", color: "var(--muted)", fontSize: 12 }}>Enrolled Date</span>
                <span>{selectedStudent.created || "2026-11-05"}</span>
              </div>
              <div>
                <span style={{ display: "block", color: "var(--muted)", fontSize: 12 }}>College</span>
                <span>College of Computer Studies</span>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: 24 }}>
              <button className="btn primary" onClick={() => setSelectedStudent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
