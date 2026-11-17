import { useState, useEffect } from "react";
import Icon from "../../components/Icon.jsx";
import { api } from "../../api.js";

const AUDIENCES = ["All CCS", "Students", "Faculty", "Organizations"];

export default function DeanAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("list"); // "list" | "create" | "edit"
  const [editId, setEditId] = useState(null);

  // Form states
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("All CCS");
  const [body, setBody] = useState("");
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api("/dean/announcements");
      setAnnouncements(res || []);
    } catch (err) {
      setError(err.message || "Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const openCreate = () => {
    setTitle("");
    setAudience("All CCS");
    setBody("");
    setEditId(null);
    setFormError("");
    setViewMode("create");
  };

  const openEdit = (ann) => {
    setTitle(ann.title);
    setAudience(ann.audience || "All CCS");
    setBody(ann.body || "");
    setEditId(ann.id);
    setFormError("");
    setViewMode("edit");
  };

  const handleSubmit = async (targetStatus) => {
    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }
    setFormBusy(true);
    setFormError("");
    try {
      if (viewMode === "edit" && editId) {
        await api(`/dean/announcements/${editId}`, {
          method: "PATCH",
          body: { title: title.trim(), body, audience, status: targetStatus }
        });
      } else {
        await api("/dean/announcements", {
          method: "POST",
          body: {
            title: title.trim(),
            body,
            audience,
            status: targetStatus,
            publish_date: targetStatus === "Published" ? new Date().toISOString().slice(0, 10) : null
          }
        });
      }
      setViewMode("list");
      fetchAnnouncements();
    } catch (err) {
      setFormError(err.message || "Failed to save announcement.");
    } finally {
      setFormBusy(false);
    }
  };

  // Status badge styling
  const renderStatus = (status) => {
    if (status === "Published") return <span className="badge ok">Published</span>;
    if (status === "Scheduled") return <span className="badge warn">Scheduled</span>;
    return <span className="badge idle">Draft</span>;
  };

  // Form View matching "Dean web — New announcement.png"
  if (viewMode === "create" || viewMode === "edit") {
    return (
      <>
        <div className="page-head" style={{ marginBottom: 8 }}>
          <div>
            <h2 className="page-title">{viewMode === "edit" ? "Edit announcement" : "New announcement"}</h2>
            <p className="lead">Write once and publish to the audience you choose</p>
          </div>
          <div className="actions">
            <button className="btn" onClick={() => setViewMode("list")}>Cancel</button>
          </div>
        </div>

        {formError && (
          <div className="form-error" role="alert">
            <Icon name="alert" /> {formError}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24, alignItems: "start" }}>
          {/* Left: Input form */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="group">
              <label htmlFor="annTitle">Title</label>
              <input
                id="annTitle"
                className="input"
                type="text"
                placeholder="e.g. Midterm examination schedule"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="group">
              <label>Audience</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                {AUDIENCES.map((aud) => {
                  const active = audience === aud;
                  return (
                    <button
                      key={aud}
                      type="button"
                      onClick={() => setAudience(aud)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 600,
                        border: "1px solid " + (active ? "var(--primary)" : "var(--border-strong)"),
                        background: active ? "var(--primary)" : "#fff",
                        color: active ? "#fff" : "var(--text)",
                        cursor: "pointer",
                        transition: "all .12s"
                      }}
                    >
                      {aud}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="group">
              <label htmlFor="annMsg">Message</label>
              <textarea
                id="annMsg"
                className="input"
                rows={6}
                style={{ height: "auto", minHeight: 140, padding: 12, resize: "vertical" }}
                placeholder="Write the announcement"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            <div
              style={{
                border: "2px dashed var(--border-strong)",
                borderRadius: "var(--radius-sm)",
                padding: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: "var(--muted)",
                fontSize: 14,
                cursor: "pointer",
                background: "#fcfdff"
              }}
            >
              <Icon name="upload" /> Attach a file
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button
                type="button"
                className="btn"
                disabled={formBusy}
                onClick={() => handleSubmit("Draft")}
              >
                Save draft
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={formBusy}
                onClick={() => handleSubmit("Published")}
              >
                {formBusy ? "Publishing…" : "Publish"}
              </button>
            </div>
          </div>

          {/* Right: Preview Card matching screenshot */}
          <div className="card">
            <h2 style={{ fontSize: 16, marginBottom: 4 }}>Preview</h2>
            <p className="sub-plain" style={{ marginBottom: 16 }}>Preview as students see it</p>

            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "16px 20px",
                background: "#fafbfe"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 12, color: "var(--muted)" }}>
                <span>Dean's Office</span>
                <span>Today</span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                {title.trim() || "Your title appears here"}
              </h3>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {body.trim() || "The first lines of your message appear here."}
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // List View matching "Dean web — Announcements.png"
  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="page-title">Announcements</h2>
          <p className="lead">Publish department-wide announcements</p>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={openCreate}>
            <Icon name="plus" /> New announcement
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
                <th scope="col">Title</th>
                <th scope="col">Audience</th>
                <th scope="col">Date</th>
                <th scope="col">Status</th>
                <th scope="col" style={{ textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                    Loading announcements…
                  </td>
                </tr>
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                    No announcements published yet.
                  </td>
                </tr>
              ) : (
                announcements.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.title}</td>
                    <td>{a.audience}</td>
                    <td className="mono">{a.publish_date || a.created_at || "Recent"}</td>
                    <td>{renderStatus(a.status)}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="link" onClick={() => openEdit(a)}>
                        Edit
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
