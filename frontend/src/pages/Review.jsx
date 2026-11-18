import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import Badge from "../components/Badge.jsx";
import Stepper from "../components/Stepper.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useToast } from "../components/Toast.jsx";
import { useStore } from "../store.jsx";
import { api } from "../api.js";
import { IMPORT_STEPS } from "./ImportPage.jsx";

export default function Review() {
  const toast = useToast();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { reload } = useStore();

  const [filter, setFilter] = useState("all");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  // the checked rows are passed from the upload step; a page refresh loses them
  if (!state?.rows) return <Navigate to="/import" replace />;

  const { fileName, rows } = state;
  const ready = rows.filter((r) => r.check === "Ready");
  const problems = rows.filter((r) => r.check !== "Ready");
  const accounts = `${ready.length.toLocaleString()} ${ready.length === 1 ? "account" : "accounts"}`;
  const shown = filter === "ready" ? ready : filter === "fix" ? problems : rows;

  async function create() {
    setSaving(true);
    try {
      // the server checks every row again before saving
      const result = await api("/import/commit", {
        method: "POST",
        body: { fileName, skipped: problems.length, rows: ready.map((r) => r.data) }
      });
      await reload();
      toast(`${result.created} accounts created` + (result.emailing ? ". Login details are being emailed." : ""));
      navigate("/students");
    } catch (err) {
      toast(err.message, "error");
      setConfirming(false);
      setSaving(false);
    }
  }

  const FILTERS = [
    { id: "all", label: "All rows", n: rows.length },
    { id: "ready", label: "Ready", n: ready.length },
    { id: "fix", label: "Need fixing", n: problems.length }
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Review import</h1>
          <p className="lead">Check the file before any accounts are created</p>
        </div>
        <Stepper steps={IMPORT_STEPS} current={2} />
      </div>

      <section className="grid-3 stat" aria-label="Import summary">
        <div className="card stat-card"><span className="stat-icon"><Icon name="file" /></span><span className="stat-label">Rows in file</span><span className="stat-value">{rows.length.toLocaleString()}</span><span className="stat-note">{fileName}</span></div>
        <div className="card stat-card"><span className="stat-icon ok"><Icon name="check" /></span><span className="stat-label">Ready to create</span><span className="stat-value">{ready.length.toLocaleString()}</span><span className="stat-note">No problems found</span></div>
        <div className="card stat-card"><span className="stat-icon bad"><Icon name="x" /></span><span className="stat-label">Need fixing</span><span className="stat-value">{problems.length.toLocaleString()}</span><span className="stat-note">Will be skipped</span></div>
      </section>

      <section className="card flush">
        <div className="toolbar">
          <div className="seg" role="group" aria-label="Filter rows">
            {FILTERS.map((f) => (
              <button key={f.id} className={filter === f.id ? "active" : ""} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label} <span className="count">{f.n}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="table-scroll review-scroll">
          <table className="table">
            <caption className="sr-only">Rows found in {fileName}</caption>
            <thead>
              <tr>
                <th scope="col" style={{ width: "8%" }}>Row</th>
                <th scope="col" style={{ width: "14%" }}>ID number</th>
                <th scope="col" style={{ width: "22%" }}>Name</th>
                <th scope="col" style={{ width: "26%" }}>Email</th>
                <th scope="col" style={{ width: "14%" }}>Program and section</th>
                <th scope="col">Check</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.row} className={r.check === "Ready" ? "" : "problem-row"}>
                  <td>{r.row}</td>
                  <td className="mono">{r.id}</td>
                  <td>{r.name}</td>
                  <td className="truncate" title={r.email}>{r.email}</td>
                  <td>{r.prog}</td>
                  <td><Badge status={r.check} tone={r.check === "Ready" ? "ok" : "bad"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-foot">
          <span>Showing {shown.length.toLocaleString()} of {rows.length.toLocaleString()} rows</span>
          <div className="pager">
            <Link className="btn" to="/import">Change file</Link>
            <button className="btn primary" disabled={ready.length === 0} onClick={() => setConfirming(true)}><Icon name="check" />Create {accounts}</button>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={confirming}
        title={`Create ${accounts}?`}
        confirmLabel={saving ? "Creating…" : `Create ${accounts}`}
        busy={saving}
        onConfirm={create}
        onCancel={() => setConfirming(false)}
      >
        <p>Each person gets a default password. Ask them to change it after they first sign in.{problems.length > 0 && <> {problems.length.toLocaleString()} {problems.length === 1 ? "row" : "rows"} with problems will be skipped.</>}</p>
      </ConfirmDialog>
    </>
  );
}
