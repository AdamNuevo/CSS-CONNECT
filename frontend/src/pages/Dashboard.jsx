import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import Badge from "../components/Badge.jsx";
import Avatar from "../components/Avatar.jsx";
import BarChart from "../components/BarChart.jsx";
import { useStore } from "../store.jsx";
import { PROGRAMS, formatDate } from "../data.js";

// counts up from 0 to the value when the dashboard opens
function useCountUp(value, ms = 700) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setShown(value);
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, ms]);
  return shown;
}

function Stat({ label, icon, value, note, tone }) {
  const shown = useCountUp(value);
  return (
    <div className="card stat-card">
      <span className={"stat-icon" + (tone ? " " + tone : "")}><Icon name={icon} /></span>
      <span className="stat-label">{label}</span>
      <span className="stat-value" aria-label={value.toLocaleString()}>{shown.toLocaleString()}</span>
      <span className="stat-note">{note}</span>
    </div>
  );
}

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

export default function Dashboard() {
  const { students, faculty, latestImport, error, reload } = useStore();
  const all = [...students, ...faculty];

  const total = all.length;
  const activated = all.filter((p) => p.status === "Activated").length;
  const notSignedIn = all.filter((p) => p.status === "Not signed in").length;
  const resets = all.filter((p) => p.status === "Reset requested");
  const issues = latestImport?.skipped ?? 0;

  const byProgram = PROGRAMS
    .map((p) => ({ label: p, value: students.filter((s) => s.section.startsWith(p + " ")).length }))
    .sort((a, b) => b.value - a.value);
  const byYear = [1, 2, 3, 4].map((y) => ({
    label: `Year ${y}`,
    value: students.filter((s) => s.section.split(" ")[1]?.[0] === String(y)).length
  }));

  const roles = [
    { label: "Students", pct: pct(students.filter((s) => s.status === "Activated").length, students.length) },
    { label: "Faculty", pct: pct(faculty.filter((s) => s.status === "Activated").length, faculty.length) }
  ];

  const recent = [
    ...students.map((p) => ({ ...p, role: "Student" })),
    ...faculty.map((p) => ({ ...p, role: "Faculty" }))
  ]
    .sort((a, b) => b.created.localeCompare(a.created))
    .slice(0, 5);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Welcome back</h1>
          <p className="lead">Account management for the College of Computer Studies</p>
        </div>
        <div className="actions">
          <Link className="btn lg" to="/add"><Icon name="plus" />Add person</Link>
          <Link className="btn primary lg" to="/import"><Icon name="upload" />Import accounts</Link>
        </div>
      </div>

      {error && (
        <div className="form-error" role="alert">
          <Icon name="alert" />Couldn't load the latest numbers: {error}
          <button className="link" onClick={reload} style={{ marginLeft: "auto" }}>Try again</button>
        </div>
      )}

      <section className="grid-4" aria-label="Summary">
        <Stat label="Total accounts" icon="users" value={total} note="Students and faculty" />
        <Stat label="Activated" icon="check" value={activated} note={`${pct(activated, total)}% have changed their password`} tone="ok" />
        <Stat label="Not yet signed in" icon="clock" value={notSignedIn} note="Still on the default password" tone="warn" />
        <Stat label="Import issues" icon="x" value={issues} note="Rows skipped in the last file" tone="bad" />
      </section>

      <section className="grid-2">
        <BarChart title="Students per program" subtitle={`${students.length} students across ${PROGRAMS.length} programs`} data={byProgram} orientation="horizontal" />
        <BarChart title="Students per year level" subtitle="All programs combined" data={byYear} orientation="vertical" />
      </section>

      <section className="grid-3">
        <div className="card">
          <div className="card-head"><h2>Activation by role</h2></div>
          {roles.map((r) => (
            <div className="role-row" key={r.label}>
              <span>{r.label}</span>
              <div className="bar" role="meter" aria-label={`${r.label} activated`} aria-valuenow={r.pct} aria-valuemin={0} aria-valuemax={100}>
                <i style={{ width: r.pct + "%" }}></i>
              </div>
              <span className="pct">{r.pct}%</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-head"><h2>Latest import</h2></div>
          {latestImport ? (
            <>
              <div className="kv"><span>File</span><span>{latestImport.file}</span></div>
              <div className="kv"><span>Date</span><span>{formatDate(latestImport.date)}</span></div>
              <div className="kv"><span>Imported</span><span>{latestImport.imported.toLocaleString()} accounts</span></div>
              <div className="kv"><span>Skipped</span><span>{latestImport.skipped.toLocaleString()} rows with errors</span></div>
            </>
          ) : (
            <p className="sub-plain">No files imported yet.</p>
          )}
          <Link className="btn" to="/import" style={{ marginTop: 12 }}><Icon name="upload" />Import {latestImport ? "more" : "accounts"}</Link>
        </div>

        <div className="card">
          <div className="card-head"><h2>Needs attention</h2></div>
          <Link className="attn" to="/students">
            <div><strong>Password reset requests</strong><small>{resets.length ? resets.slice(0, 2).map((p) => p.name).join(", ") : "None right now"}</small></div>
            <span className={"badge " + (resets.length ? "warn" : "ok")}>{resets.length}</span>
          </Link>
          <Link className="attn" to="/students">
            <div><strong>Not yet signed in</strong><small>Still on the default password</small></div>
            <span className={"badge " + (notSignedIn ? "warn" : "ok")}>{notSignedIn}</span>
          </Link>
          <Link className="attn" to="/import">
            <div><strong>Import rows skipped</strong><small>{latestImport ? latestImport.file : "No files imported yet"}</small></div>
            <span className={"badge " + (issues ? "bad" : "ok")}>{issues}</span>
          </Link>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Recently added</h2>
          <Link className="btn" to="/students">View all students</Link>
        </div>
        <div className="table-scroll">
          <table className="table">
            <caption className="sr-only">Recently added accounts</caption>
            <thead>
              <tr><th scope="col">Person</th><th scope="col">Role</th><th scope="col">Added</th><th scope="col">Status</th></tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.no}>
                  <td>
                    <span className="person">
                      <Avatar name={p.name} photo={p.photo} />
                      <span>{p.name}<small>{p.no}</small></span>
                    </span>
                  </td>
                  <td>{p.role}</td>
                  <td>{formatDate(p.created)}</td>
                  <td><Badge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
