import { useEffect, useState } from "react";
import Icon from "../components/Icon.jsx";
import Badge from "../components/Badge.jsx";
import { api } from "../api.js";
import { ACTIVITY_TYPES, formatDateTime } from "../data.js";

export default function Activity() {
  const [action, setAction] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState(""); // the search text, once the user pauses typing
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);
  useEffect(() => { setPage(1); }, [action, q]);

  // `cancelled` lets an older, slower request be ignored once a newer one has started
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page) });
    if (action) params.set("action", action);
    if (q) params.set("q", q);
    api("/activity?" + params)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [action, q, page, reloadKey]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;
  const current = data?.page ?? page;
  const start = (current - 1) * (data?.pageSize ?? 15);
  const filtered = Boolean(action || q);
  const refresh = () => setReloadKey((k) => k + 1);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Activity log</h1>
          <p className="lead">A record of every change made in this portal. It can't be edited or deleted.</p>
        </div>
        <div className="actions">
          <button className="btn lg" onClick={refresh} disabled={loading}>Refresh</button>
        </div>
      </div>

      <section className="card flush">
        <div className="filters">
          <label className="field-sm">Action
            <select className="select" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">All actions</option>
              {Object.entries(ACTIVITY_TYPES).map(([key, t]) => <option key={key} value={key}>{t.label}</option>)}
            </select>
          </label>
          <label className="field-sm grow">Search
            <input className="input" type="search" placeholder="Name, ID number or details" maxLength={100} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          {filtered && <button className="link clear" onClick={() => { setAction(""); setText(""); }}>Clear filters</button>}
        </div>

        <div className="table-scroll">
          <table className="table cards">
            <caption className="sr-only">Activity log, newest first</caption>
            <thead>
              <tr>
                <th scope="col" style={{ width: "21%" }}>When</th>
                <th scope="col" style={{ width: "19%" }}>Who</th>
                <th scope="col" style={{ width: "19%" }}>Action</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => {
                const type = ACTIVITY_TYPES[a.action] || { label: a.action, tone: "idle" };
                return (
                  <tr key={a.id}>
                    <td className="mono c-when">{formatDateTime(a.at)}</td>
                    <td className="c-who"><span className="m-label">By </span>{a.actor}</td>
                    <td className="c-action"><Badge status={type.label} tone={type.tone} /></td>
                    <td className="c-details">
                      {a.targetName ? <>{a.targetName} <span className="mono">({a.targetId})</span></> : null}
                      {a.detail && <small className="sub">{a.detail}</small>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {error && (
          <div className="empty" role="alert">
            <Icon name="alert" />
            <strong>Couldn't load the activity log</strong>
            <p>{error}</p>
            <button className="btn" onClick={refresh}>Try again</button>
          </div>
        )}
        {!error && loading && items.length === 0 && <div className="empty" role="status"><strong>Loading activity…</strong></div>}
        {!error && !loading && items.length === 0 && (
          <div className="empty">
            <Icon name="clock" />
            <strong>{filtered ? "No matching activity" : "No activity yet"}</strong>
            <p>{filtered ? "Try a different search, or clear the filters." : "Changes you make in this portal will show up here."}</p>
          </div>
        )}

        <div className="table-foot">
          <span>{total ? `Showing ${start + 1}–${start + items.length} of ${total.toLocaleString()}` : "Showing 0 of 0"}</span>
          <div className="pager">
            <button className="btn" disabled={current <= 1 || loading} onClick={() => setPage(current - 1)}><Icon name="chevron-left" />Previous</button>
            <span className="page-ind">Page {current} of {pages}</span>
            <button className="btn" disabled={current >= pages || loading} onClick={() => setPage(current + 1)}>Next<Icon name="chevron-right" /></button>
          </div>
        </div>
      </section>
    </>
  );
}
