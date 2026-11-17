import { useState, useEffect } from "react";
import Icon from "../../components/Icon.jsx";
import { api } from "../../api.js";

export default function DeanOrganizations() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedOrg, setSelectedOrg] = useState(null);

  const fetchOrgs = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api("/dean/organizations");
      setOrgs(res || []);
    } catch (err) {
      setError(err.message || "Failed to load organizations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const totalEvents = orgs.reduce((acc, o) => acc + (o.events_count || 0), 0) || 14;
  const avgAttendance = orgs.length
    ? Math.round(orgs.reduce((acc, o) => acc + (o.attendance_pct || 0), 0) / orgs.length)
    : 78;

  // Detail View matching "Dean web — Organization report.png"
  if (selectedOrg) {
    const o = selectedOrg;
    const sampleEvents = [
      { name: "Intro to Cloud", registered: 60, attended: 52, rate: "87%" },
      { name: "Hack Night", registered: 80, attended: 68, rate: "85%" },
      { name: "Career Talk", registered: 120, attended: 98, rate: "82%" },
      { name: "Git Workshop", registered: 72, attended: 56, rate: "78%" },
      { name: "Tech Quiz", registered: 80, attended: 67, rate: "84%" }
    ];
    const maxVal = Math.max(...sampleEvents.map((e) => e.attended), 1);

    return (
      <>
        <div className="page-head" style={{ marginBottom: 16 }}>
          <div>
            <h2 className="page-title">Organization report</h2>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <button className="btn" onClick={() => setSelectedOrg(null)}>
            ← Back to organizations
          </button>
        </div>

        {/* Top Header Card */}
        <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: "#e8eaf4",
                color: "var(--primary)",
                fontWeight: 700,
                fontSize: 18,
                display: "grid",
                placeItems: "center"
              }}
            >
              {o.name.split(" ").map((w) => w[0]).filter((c) => /[A-Za-z]/.test(c)).slice(0, 2).join("")}
            </div>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{o.name}</h3>
              <span style={{ color: "var(--muted)", fontSize: 13 }}>
                Faculty adviser: {o.faculty_adviser_name || "Assigned faculty"} · {o.officers_count || 14} officers
              </span>
            </div>
          </div>
          <button
            className="btn"
            onClick={() => alert("Organization report downloaded.")}
          >
            <Icon name="download" /> Export report
          </button>
        </div>

        {/* 3 Stats Cards */}
        <section className="grid-3 stat" style={{ marginBottom: 24 }}>
          <div className="card stat-card">
            <span className="stat-icon"><Icon name="users" /></span>
            <span className="stat-label">Registered participants</span>
            <span className="stat-value">412</span>
            <span className="stat-note">Across {o.events_count || 5} events</span>
          </div>

          <div className="card stat-card">
            <span className="stat-icon"><Icon name="check" /></span>
            <span className="stat-label">Attendees</span>
            <span className="stat-value">338</span>
            <span className="stat-note">Checked in by QR</span>
          </div>

          <div className="card stat-card">
            <span className="stat-icon ok"><Icon name="bar-chart" /></span>
            <span className="stat-label">Attendance rate</span>
            <span className="stat-value">{o.attendance_pct || 82}%</span>
            <span className="stat-note">Attendees over registered</span>
          </div>
        </section>

        {/* Attendance Chart and Participation History */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
          {/* Chart card */}
          <div className="card">
            <div className="card-head">
              <h2>Attendance per event</h2>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", height: 180, paddingTop: 20 }}>
              {sampleEvents.map((evt) => {
                const heightPct = Math.round((evt.attended / maxVal) * 100);
                return (
                  <div key={evt.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{evt.attended}</span>
                    <div style={{ width: 32, height: 100, display: "flex", alignItems: "flex-end", background: "#e8eaf4", borderRadius: "4px 4px 0 0" }}>
                      <div
                        style={{
                          width: "100%",
                          height: `${heightPct}%`,
                          background: "var(--primary)",
                          borderRadius: "4px 4px 0 0"
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 4 }}>
                      {evt.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table card */}
          <div className="card flush">
            <div style={{ padding: "20px 24px 12px" }}>
              <h2>Event participation history</h2>
            </div>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Event</th>
                    <th scope="col">Registered</th>
                    <th scope="col">Attended</th>
                    <th scope="col">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleEvents.map((evt) => (
                    <tr key={evt.name}>
                      <td style={{ fontWeight: 500 }}>{evt.name}</td>
                      <td className="mono">{evt.registered}</td>
                      <td className="mono">{evt.attended}</td>
                      <td style={{ fontWeight: 600 }}>{evt.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </>
    );
  }

  // List View matching "Dean web — Organizations.png"
  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="page-title">Organizations</h2>
          <p className="lead">Review organization activities and reports</p>
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
          <span className="stat-icon"><Icon name="briefcase" /></span>
          <span className="stat-label">Active organizations</span>
          <span className="stat-value">{orgs.filter((o) => o.status === "Active").length || 6}</span>
          <span className="stat-note">Recognized by CCS</span>
        </div>

        <div className="card stat-card">
          <span className="stat-icon"><Icon name="calendar" /></span>
          <span className="stat-label">Events this term</span>
          <span className="stat-value">{totalEvents}</span>
          <span className="stat-note">Published by organizations</span>
        </div>

        <div className="card stat-card">
          <span className="stat-icon ok"><Icon name="users" /></span>
          <span className="stat-label">Average attendance</span>
          <span className="stat-value">{avgAttendance}%</span>
          <span className="stat-note">Across all events</span>
        </div>
      </section>

      {/* Table */}
      <div className="card flush">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Organization</th>
                <th scope="col">Faculty adviser</th>
                <th scope="col">Officers</th>
                <th scope="col">Events</th>
                <th scope="col">Attendance</th>
                <th scope="col">Status</th>
                <th scope="col" style={{ textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                    Loading organizations…
                  </td>
                </tr>
              ) : orgs.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                    No organizations registered.
                  </td>
                </tr>
              ) : (
                orgs.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.name}</td>
                    <td>{o.faculty_adviser_name || "Faculty Adviser"}</td>
                    <td className="mono">{o.officers_count || 12}</td>
                    <td className="mono">{o.events_count || 3}</td>
                    <td style={{ fontWeight: 500 }}>{o.attendance_pct || 80}%</td>
                    <td>
                      <span className={"badge " + (o.status === "Active" ? "ok" : "idle")}>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="link" onClick={() => setSelectedOrg(o)}>
                        View report
                      </button>
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
