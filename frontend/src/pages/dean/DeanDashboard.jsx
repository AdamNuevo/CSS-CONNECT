import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Icon from "../../components/Icon.jsx";
import Avatar from "../../components/Avatar.jsx";
import { api } from "../../api.js";

function Stat({ label, icon, value, note, tone }) {
  return (
    <div className="card stat-card">
      <span className={"stat-icon" + (tone ? " " + tone : "")}><Icon name={icon} /></span>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{typeof value === "number" ? value.toLocaleString() : value ?? "—"}</span>
      <span className="stat-note">{note}</span>
    </div>
  );
}

export default function DeanDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api("/dean/dashboard");
      setData(res);
    } catch (err) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "48px 0", textAlign: "center", color: "var(--muted)" }}>
        Loading dashboard…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="form-error" role="alert">
        <Icon name="alert" /> {error || "No dashboard data available."}
        <button className="link" onClick={loadData} style={{ marginLeft: "auto" }}>Try again</button>
      </div>
    );
  }

  const { stats, byProgram, byYear, researchStatus, upcomingEvents, latestAnnouncements, teachingAssignments } = data;

  // Max value calculation for program bars
  const maxProgramVal = Math.max(...(byProgram || []).map((p) => p.value), 1);
  const maxYearVal = Math.max(...(byYear || []).map((y) => y.value), 1);

  // Total research count for status bar
  const totalResearch = (researchStatus.approved || 0) + (researchStatus.underReview || 0) + (researchStatus.needsRevision || 0) || 1;
  const approvedPct = Math.round(((researchStatus.approved || 0) / totalResearch) * 100);
  const reviewPct = Math.round(((researchStatus.underReview || 0) / totalResearch) * 100);
  const revisionPct = 100 - approvedPct - reviewPct;

  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="lead">College of Computer Studies · AY 2025–2026, 1st Semester</p>
        </div>
      </div>

      {/* Summary Cards */}
      <section className="grid-4" aria-label="Summary">
        <Stat
          label="Total students"
          icon="user"
          value={stats.totalStudents}
          note="BSIT, BSCS and BSIS"
        />
        <Stat
          label="Faculty members"
          icon="users"
          value={stats.facultyMembers}
          note="Active this term"
        />
        <Stat
          label="Active organizations"
          icon="briefcase"
          value={stats.activeOrgs}
          note="6 events this term"
          tone="ok"
        />
        <Stat
          label="Research and capstone"
          icon="book-open"
          value={stats.researchCount}
          note="Submissions this year"
        />
      </section>

      {/* Row 2: Charts and Status */}
      <section className="grid-3">
        {/* Students per Program */}
        <div className="card">
          <div className="card-head">
            <h2>Students per program</h2>
          </div>
          <div className="hbars" style={{ marginTop: 12 }}>
            {(byProgram || []).map((item) => {
              const widthPct = Math.max(8, Math.round((item.value / maxProgramVal) * 100));
              return (
                <div className="hbar-row" key={item.label}>
                  <span className="hbar-label">{item.label}</span>
                  <div className="hbar-plot">
                    <div style={{ flex: 1, height: 16, background: "#e8eaf4", borderRadius: 4, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${widthPct}%`,
                          background: item.label === "BSIT" ? "var(--primary)" : "#6a82fb",
                          borderRadius: 4
                        }}
                      />
                    </div>
                    <span className="hbar-value" style={{ minWidth: 32, textAlign: "right" }}>
                      {item.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Students per Year Level */}
        <div className="card">
          <div className="card-head">
            <h2>Students per year level</h2>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", height: 160, paddingTop: 20 }}>
            {(byYear || []).map((item) => {
              const heightPct = Math.max(15, Math.round((item.value / maxYearVal) * 100));
              return (
                <div key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{item.value}</span>
                  <div style={{ width: 36, height: 90, display: "flex", alignItems: "flex-end", background: "#e8eaf4", borderRadius: "4px 4px 0 0" }}>
                    <div
                      style={{
                        width: "100%",
                        height: `${heightPct}%`,
                        background: "var(--primary)",
                        borderRadius: "4px 4px 0 0"
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Research and Capstone Status */}
        <div className="card">
          <div className="card-head">
            <h2>Research and capstone status</h2>
            <Link className="link" to="/dean/research">View</Link>
          </div>
          {/* Segmented bar */}
          <div style={{ height: 12, borderRadius: 6, display: "flex", overflow: "hidden", margin: "16px 0 20px" }}>
            <div style={{ width: `${approvedPct}%`, background: "#10b981" }} title={`Approved: ${researchStatus.approved}`} />
            <div style={{ width: `${reviewPct}%`, background: "#f59e0b" }} title={`Under review: ${researchStatus.underReview}`} />
            <div style={{ width: `${revisionPct}%`, background: "#ef4444" }} title={`Needs revision: ${researchStatus.needsRevision}`} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "#10b981" }} />
                Approved
              </span>
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>{researchStatus.approved}</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "#f59e0b" }} />
                Under review
              </span>
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>{researchStatus.underReview}</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "#ef4444" }} />
                Needs revision
              </span>
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>{researchStatus.needsRevision}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Row 3: Events, Announcements, Teaching Assignments */}
      <section className="grid-3">
        {/* Upcoming Events */}
        <div className="card">
          <div className="card-head">
            <h2>Upcoming events</h2>
            <Link className="link" to="/dean/schedules">All</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {(!upcomingEvents || upcomingEvents.length === 0) ? (
              <p className="sub-plain">No upcoming events scheduled.</p>
            ) : (
              upcomingEvents.slice(0, 3).map((evt) => {
                const dateParts = evt.event_date ? new Date(evt.event_date) : new Date();
                const month = dateParts.toLocaleString("en-US", { month: "short" }).toUpperCase();
                const day = dateParts.getDate();
                return (
                  <div key={evt.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        background: "#e8eaf4",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", lineHeight: 1 }}>{month}</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>{day}</span>
                    </div>
                    <div>
                      <strong style={{ display: "block", fontSize: 14 }}>{evt.title}</strong>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{evt.organizer}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Latest Announcements */}
        <div className="card">
          <div className="card-head">
            <h2>Latest announcements</h2>
            <Link className="link" to="/dean/announcements">+ New</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {(!latestAnnouncements || latestAnnouncements.length === 0) ? (
              <p className="sub-plain">No announcements posted yet.</p>
            ) : (
              latestAnnouncements.map((ann) => (
                <div key={ann.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
                  <span style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 2 }}>
                    {ann.date ? new Date(ann.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recent"} · {ann.audience}
                  </span>
                  <Link to="/dean/announcements" style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>
                    {ann.title}
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Teaching Assignments */}
        <div className="card">
          <div className="card-head">
            <h2>Teaching assignments</h2>
            <Link className="link" to="/dean/faculty">All</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {(!teachingAssignments || teachingAssignments.length === 0) ? (
              <p className="sub-plain">No assignments recorded.</p>
            ) : (
              teachingAssignments.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar name={f.faculty_name} />
                  <div>
                    <strong style={{ display: "block", fontSize: 14 }}>{f.faculty_name}</strong>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      {f.subject_count || 4} subjects · {f.total_units || 12} units
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}
