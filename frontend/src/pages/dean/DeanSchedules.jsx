import { useState, useEffect } from "react";
import Icon from "../../components/Icon.jsx";
import { api } from "../../api.js";

const PROGRAMS = ["All programs", "BSIT", "BSCS", "BSIS"];
const YEARS = ["All years", "1", "2", "3", "4"];
const SECTIONS = ["All sections", "3-A", "3-B", "2-A", "2-B", "1-A", "1-B", "4-A", "4-B"];

export default function DeanSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [program, setProgram] = useState("All programs");
  const [year, setYear] = useState("All years");
  const [section, setSection] = useState("All sections");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSchedules = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (program !== "All programs") params.set("program", program);
      if (year !== "All years") params.set("year", year);
      if (section !== "All sections") params.set("section", section);

      const res = await api(`/dean/schedules?${params.toString()}`);
      setSchedules(res || []);
    } catch (err) {
      setError(err.message || "Failed to load schedules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [program, year, section]);

  const totalClasses = schedules.length;
  const uniqueRooms = new Set(schedules.map((s) => s.room).filter(Boolean)).size;
  const conflictCount = schedules.filter((s) => s.has_conflict).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="page-title">Schedules</h2>
          <p className="lead">Monitor class schedules across the department</p>
        </div>
      </div>

      {error && (
        <div className="form-error" role="alert">
          <Icon name="alert" /> {error}
        </div>
      )}

      {/* 3 Stat Cards */}
      <section className="grid-3 stat">
        <div className="card stat-card">
          <span className="stat-icon"><Icon name="calendar" /></span>
          <span className="stat-label">Classes this week</span>
          <span className="stat-value">{totalClasses || 142}</span>
          <span className="stat-note">All programs</span>
        </div>

        <div className="card stat-card">
          <span className="stat-icon"><Icon name="briefcase" /></span>
          <span className="stat-label">Rooms in use</span>
          <span className="stat-value">{uniqueRooms || 18}</span>
          <span className="stat-note">Labs and classrooms</span>
        </div>

        <div className="card stat-card">
          <span className="stat-icon warn"><Icon name="alert" /></span>
          <span className="stat-label">Schedule conflicts</span>
          <span className="stat-value" style={{ color: conflictCount ? "var(--bad-fg)" : "inherit" }}>
            {conflictCount}
          </span>
          <span className="stat-note">Needs attention</span>
        </div>
      </section>

      {/* Filter and Table Card */}
      <div className="card flush">
        <div className="filters">
          <div className="field-sm">
            <span>Program</span>
            <select className="select" value={program} onChange={(e) => setProgram(e.target.value)}>
              {PROGRAMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="field-sm">
            <span>Year level</span>
            <select className="select" value={year} onChange={(e) => setYear(e.target.value)}>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y === "All years" ? y : `Year ${y}`}</option>
              ))}
            </select>
          </div>

          <div className="field-sm">
            <span>Section</span>
            <select className="select" value={section} onChange={(e) => setSection(e.target.value)}>
              {SECTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Subject</th>
                <th scope="col">Section</th>
                <th scope="col">Faculty</th>
                <th scope="col">Room</th>
                <th scope="col">Flag</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                    Loading schedules…
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                    No schedules found.
                  </td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id} className={s.has_conflict ? "problem-row" : ""}>
                    <td style={{ fontWeight: 500 }}>
                      {s.day_of_week?.slice(0, 3)} {s.time_start} – {s.time_end}
                    </td>
                    <td>
                      <strong>{s.subject_code}</strong> · {s.subject_name}
                    </td>
                    <td>{s.program} {s.year_level}-{s.section}</td>
                    <td>{s.faculty_name || "Unassigned"}</td>
                    <td>{s.room}</td>
                    <td>
                      {s.has_conflict ? (
                        <span className="badge warn" title={s.conflict_note || "Scheduling conflict detected"}>
                          {s.conflict_note?.includes("Room") ? "Room conflict" : "Schedule conflict"}
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      )}
                    </td>
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
