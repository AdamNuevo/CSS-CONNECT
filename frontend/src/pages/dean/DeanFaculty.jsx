import { useState, useEffect } from "react";
import Avatar from "../../components/Avatar.jsx";
import Icon from "../../components/Icon.jsx";
import { api } from "../../api.js";

export default function DeanFaculty() {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState(null);

  const fetchFaculty = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api("/dean/faculty");
      setFaculty(res || []);
    } catch (err) {
      setError(err.message || "Failed to load faculty.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  const handleExport = () => {
    const headers = ["Faculty ID", "Name", "Email", "Position", "Specialization", "Department", "Units", "Status"];
    const rows = faculty.map((f) => [
      f.no,
      `"${f.name}"`,
      f.email,
      `"${f.position || ""}"`,
      `"${f.specialization || ""}"`,
      `"${f.department || ""}"`,
      f.units || 12,
      f.available ? "Available" : "Not available"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `faculty_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If a faculty profile is selected, render the detail view matching "Dean web — Faculty profile.png"
  if (selectedFaculty) {
    const f = selectedFaculty;
    return (
      <>
        <div className="page-head" style={{ marginBottom: 16 }}>
          <div>
            <h2 className="page-title">Faculty profile</h2>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <button
            className="btn"
            onClick={() => setSelectedFaculty(null)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            ← Back to faculty
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24, alignItems: "start" }}>
          {/* Left card: Faculty identity */}
          <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "32px 24px" }}>
            <div style={{ width: 84, height: 84, borderRadius: "50%", background: "#101b59", color: "#fff", display: "grid", placeItems: "center", fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
              {f.name.split(" ").map(w => w[0]).filter(c => /[A-Za-z]/.test(c)).slice(0, 2).join("")}
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{f.name}</h3>
            <span style={{ color: "var(--muted)", fontSize: 13, marginBottom: 8 }}>{f.no}</span>
            <span style={{ background: "#e8eaf4", color: "var(--primary)", fontSize: 12, fontWeight: 600, padding: "3px 12px", borderRadius: 999, marginBottom: 24 }}>
              {f.position}
            </span>

            <div style={{ width: "100%", textAlign: "left", display: "flex", flexDirection: "column", gap: 14, borderTop: "1px solid var(--border)", paddingTop: 20 }}>
              <div>
                <span style={{ fontSize: 12, color: "var(--muted)", display: "block" }}>University email</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{f.email}</span>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "var(--muted)", display: "block" }}>Department</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>College of Computer Studies · {f.department}</span>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "var(--muted)", display: "block" }}>Specialization</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{f.specialization}</span>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "var(--muted)", display: "block" }}>Availability today</span>
                <span className={"badge " + (f.available ? "ok" : "idle")}>
                  {f.available ? "Available" : "Not available"}
                </span>
              </div>
            </div>
          </div>

          {/* Right column: Teaching assignments, Consultations */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Teaching assignments card */}
            <div className="card flush">
              <div style={{ padding: "18px 24px 12px" }}>
                <h2>Teaching assignments</h2>
              </div>
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Subject</th>
                      <th scope="col">Section</th>
                      <th scope="col">Schedule</th>
                      <th scope="col">Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>IT 303 · Mobile Application Development</td>
                      <td>BSIT 3-A</td>
                      <td>Wed 1:00 – 2:30 PM</td>
                      <td>Lab 2</td>
                    </tr>
                    <tr>
                      <td>IT 303 · Mobile Application Development</td>
                      <td>BSIT 3-B</td>
                      <td>Wed 3:00 – 4:30 PM</td>
                      <td>Lab 2</td>
                    </tr>
                    <tr>
                      <td>IT 202 · Object-Oriented Programming</td>
                      <td>BSIT 2-A</td>
                      <td>Wed & Fri 9:00 – 10:30 AM</td>
                      <td>Rm 305</td>
                    </tr>
                    <tr>
                      <td>IT 405 · Cloud Computing</td>
                      <td>BSIT 4-A</td>
                      <td>Thu 1:00 – 4:00 PM</td>
                      <td>Lab 1</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom 2 mini cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div className="card">
                <h2 style={{ marginBottom: 12 }}>Consultation availability</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>Monday</span>
                    <strong style={{ fontWeight: 500 }}>2:00 – 4:00 PM</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>Wednesday</span>
                    <strong style={{ fontWeight: 500 }}>4:30 – 5:30 PM</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>Thursday</span>
                    <strong style={{ fontWeight: 500 }}>10:00 AM – 12:00 PM</strong>
                  </div>
                </div>
              </div>

              <div className="card">
                <h2 style={{ marginBottom: 12 }}>Consultations this term</h2>
                <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center", marginBottom: 14 }}>
                  <div>
                    <span style={{ fontSize: 24, fontWeight: 700, display: "block" }}>12</span>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>Requests</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 24, fontWeight: 700, color: "var(--ok-fg)", display: "block" }}>9</span>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>Completed</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 24, fontWeight: 700, color: "var(--bad-fg)", display: "block" }}>2</span>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>Declined</span>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>Evaluation rating</span>
                  <strong style={{ fontSize: 14 }}>4.6 / 5</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // List view matching "Dean web — Faculty.png"
  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="page-title">Faculty</h2>
          <p className="lead">Faculty profiles, teaching load and availability</p>
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
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Position</th>
                <th scope="col">Specialization</th>
                <th scope="col">Teaching load</th>
                <th scope="col">Availability today</th>
                <th scope="col" style={{ textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                    Loading faculty…
                  </td>
                </tr>
              ) : faculty.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                    No faculty found.
                  </td>
                </tr>
              ) : (
                faculty.map((f) => (
                  <tr key={f.no}>
                    <td>
                      <span className="person">
                        <Avatar name={f.name} photo={f.photo} />
                        <span>
                          {f.name}
                          <small>{f.no}</small>
                        </span>
                      </span>
                    </td>
                    <td>{f.position}</td>
                    <td>{f.specialization}</td>
                    <td className="mono">{f.units} units</td>
                    <td>
                      <span className={"badge " + (f.available ? "ok" : "idle")}>
                        {f.available ? "Available" : "Not available"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="link"
                        onClick={() => setSelectedFaculty(f)}
                      >
                        View profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-foot">
          <span>Showing 1–{faculty.length} of {faculty.length} entries</span>
        </div>
      </div>
    </>
  );
}
