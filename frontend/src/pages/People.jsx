import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import Badge from "../components/Badge.jsx";
import Avatar from "../components/Avatar.jsx";
import RowMenu from "../components/RowMenu.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useToast } from "../components/Toast.jsx";
import { useStore } from "../store.jsx";
import { PROGRAMS, ACAD_STATUSES, DEPARTMENTS, ACCOUNT_STATUSES } from "../data.js";

const PAGE_SIZE = 10;
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

const ACTIONS = {
  reset: { title: "Reset password?", verb: "Reset password", done: (n) => `Password reset for ${n}`, danger: false },
  deactivate: { title: "Deactivate account?", verb: "Deactivate", done: (n) => `${n} was deactivated`, danger: true },
  reactivate: { title: "Reactivate account?", verb: "Reactivate", done: (n) => `${n} was reactivated`, danger: false }
};

function SortTh({ label, field, sort, onSort, style }) {
  const active = sort.key === field;
  return (
    <th scope="col" style={style} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button className={"th-btn" + (active ? " active" : "")} onClick={() => onSort(field)}>
        {label}
        <Icon name={active ? (sort.dir === "asc" ? "arrow-up" : "arrow-down") : "sort"} />
      </button>
    </th>
  );
}

export default function People({ kind }) {
  const isStudents = kind === "students";
  const toast = useToast();
  const { students, faculty, applyAction, loading, error, reload } = useStore();
  const data = isStudents ? students : faculty;
  const [params] = useSearchParams();
  const q = (params.get("q") || "").trim().toLowerCase();

  const [f, setF] = useState({ a: "", b: "", c: "", d: "" });
  const [sort, setSort] = useState({ key: "no", dir: "asc" });
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null); // { type, person }
  const [busy, setBusy] = useState(false);

  // each tab starts with a clean slate; any change to what's shown goes back to page 1
  useEffect(() => { setF({ a: "", b: "", c: "", d: "" }); setSort({ key: "no", dir: "asc" }); }, [kind]);
  useEffect(() => { setPage(1); }, [q, f, sort, kind]);

  const setFilter = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const anyFilter = Object.values(f).some(Boolean);

  const rows = useMemo(() => {
    const filtered = data.filter((d) => {
      const hay = (d.no + " " + d.name + " " + d.email).toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (isStudents) {
        const [prog, yr] = d.section.split(" ");
        if (f.a && prog !== f.a) return false;
        if (f.b && yr[0] !== f.b) return false;
        if (f.c && !d.section.endsWith("-" + f.c)) return false;
        if (f.d && d.acad !== f.d) return false;
      } else {
        if (f.a && d.dept !== f.a) return false;
        if (f.b && d.status !== f.b) return false;
      }
      return true;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((x, y) => dir * collator.compare(String(x[sort.key] ?? ""), String(y[sort.key] ?? "")));
  }, [data, q, f, sort, isStudents]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const start = (current - 1) * PAGE_SIZE;
  const visible = rows.slice(start, start + PAGE_SIZE);

  const onSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  async function runConfirm() {
    const { type, person } = confirm;
    setBusy(true);
    try {
      await applyAction(kind, person.no, type);
      toast(ACTIONS[type].done(person.name));
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const menuFor = (p) => [
    { label: "Reset password", onSelect: () => setConfirm({ type: "reset", person: p }) },
    p.status === "Deactivated"
      ? { label: "Reactivate account", onSelect: () => setConfirm({ type: "reactivate", person: p }) }
      : { label: "Deactivate account", danger: true, onSelect: () => setConfirm({ type: "deactivate", person: p }) }
  ];

  const sortProps = { sort, onSort };
  const action = confirm && ACTIONS[confirm.type];

  return (
    <>
      <div className="page-head">
        <p className="lead">Create, update and deactivate accounts</p>
        <Link className="btn primary lg" to="/add"><Icon name="plus" />Add person</Link>
      </div>

      <div className="tabs" role="tablist" aria-label="Account type">
        <NavLink to="/students" role="tab" className={isStudents ? "active" : ""} aria-selected={isStudents}>Students <span className="count">{students.length}</span></NavLink>
        <NavLink to="/faculty" role="tab" className={!isStudents ? "active" : ""} aria-selected={!isStudents}>Faculty <span className="count">{faculty.length}</span></NavLink>
      </div>

      <section className="card flush">
        <div className="filters">
          {isStudents ? (
            <>
              <label className="field-sm">Program
                <select className="select" value={f.a} onChange={setFilter("a")}>
                  <option value="">All programs</option>
                  {PROGRAMS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </label>
              <label className="field-sm">Year level
                <select className="select" value={f.b} onChange={setFilter("b")}>
                  <option value="">All years</option>
                  <option value="1">1st year</option><option value="2">2nd year</option>
                  <option value="3">3rd year</option><option value="4">4th year</option>
                </select>
              </label>
              <label className="field-sm">Section
                <select className="select" value={f.c} onChange={setFilter("c")}>
                  <option value="">All sections</option><option>A</option><option>B</option>
                </select>
              </label>
              <label className="field-sm">Academic status
                <select className="select" value={f.d} onChange={setFilter("d")}>
                  <option value="">All statuses</option>
                  {ACAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
            </>
          ) : (
            <>
              <label className="field-sm">Department
                <select className="select" value={f.a} onChange={setFilter("a")}>
                  <option value="">All departments</option>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
              <label className="field-sm">Account
                <select className="select" value={f.b} onChange={setFilter("b")}>
                  <option value="">All accounts</option>
                  {ACCOUNT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
            </>
          )}
          {anyFilter && <button className="link clear" onClick={() => setF({ a: "", b: "", c: "", d: "" })}>Clear filters</button>}
        </div>

        <div className="table-scroll">
          <table className="table">
            <caption className="sr-only">{isStudents ? "Student accounts" : "Faculty accounts"}</caption>
            <thead>
              {isStudents ? (
                <tr>
                  <SortTh label="Student no." field="no" {...sortProps} style={{ width: "15%" }} />
                  <SortTh label="Name" field="name" {...sortProps} style={{ width: "33%" }} />
                  <SortTh label="Section" field="section" {...sortProps} style={{ width: "14%" }} />
                  <SortTh label="Academic" field="acad" {...sortProps} style={{ width: "16%" }} />
                  <SortTh label="Account" field="status" {...sortProps} style={{ width: "18%" }} />
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              ) : (
                <tr>
                  <SortTh label="Faculty ID" field="no" {...sortProps} style={{ width: "15%" }} />
                  <SortTh label="Name" field="name" {...sortProps} style={{ width: "30%" }} />
                  <SortTh label="Department" field="dept" {...sortProps} style={{ width: "14%" }} />
                  <SortTh label="Position" field="position" {...sortProps} style={{ width: "21%" }} />
                  <SortTh label="Account" field="status" {...sortProps} style={{ width: "16%" }} />
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              )}
            </thead>
            <tbody>
              {visible.map((d) => (
                <tr key={d.no} className={d.status === "Deactivated" ? "muted-row" : ""}>
                  <td className="mono">{d.no}</td>
                  <td><span className="person"><Avatar name={d.name} photo={d.photo} /><span>{d.name}<small>{d.email}</small></span></span></td>
                  <td>{isStudents ? d.section : d.dept}</td>
                  {isStudents
                    ? <td><Badge status={d.acad} /></td>
                    : <td>{d.position}<small className="sub">{d.spec}</small></td>}
                  <td><Badge status={d.status} /></td>
                  <td className="actions-cell"><RowMenu label={`Actions for ${d.name}`} items={menuFor(d)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && (
          <div className="empty" role="alert">
            <Icon name="alert" />
            <strong>Couldn't load accounts</strong>
            <p>{error}</p>
            <button className="btn" onClick={reload}>Try again</button>
          </div>
        )}
        {!error && loading && data.length === 0 && <div className="empty" role="status"><strong>Loading accounts…</strong></div>}
        {!error && !loading && rows.length === 0 && (
          <div className="empty">
            <Icon name="search" />
            <strong>{data.length === 0 ? "No accounts yet" : "No matching accounts"}</strong>
            <p>{data.length === 0 ? "Import a CSV file or add a person to get started." : "Try a different search, or clear the filters."}</p>
            {anyFilter && <button className="btn" onClick={() => setF({ a: "", b: "", c: "", d: "" })}>Clear filters</button>}
          </div>
        )}

        <div className="table-foot">
          <span>{rows.length ? `Showing ${start + 1}–${start + visible.length} of ${rows.length}` : "Showing 0 of 0"}</span>
          <div className="pager">
            <button className="btn" disabled={current <= 1} onClick={() => setPage(current - 1)}><Icon name="chevron-left" />Previous</button>
            <span className="page-ind">Page {current} of {pages}</span>
            <button className="btn" disabled={current >= pages} onClick={() => setPage(current + 1)}>Next<Icon name="chevron-right" /></button>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={!!confirm}
        title={action?.title}
        confirmLabel={action?.verb}
        danger={action?.danger}
        busy={busy}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      >
        {confirm && (
          confirm.type === "reset"
            ? <p><strong>{confirm.person.name}</strong> will get a new default password and must change it the next time they sign in.</p>
            : confirm.type === "deactivate"
              ? <p><strong>{confirm.person.name}</strong> will no longer be able to sign in. You can reactivate the account later.</p>
              : <p><strong>{confirm.person.name}</strong> will be able to sign in again.</p>
        )}
      </ConfirmDialog>
    </>
  );
}
