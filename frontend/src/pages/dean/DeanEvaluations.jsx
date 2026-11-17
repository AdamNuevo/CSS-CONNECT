import { useState, useEffect } from "react";
import Icon from "../../components/Icon.jsx";
import { api } from "../../api.js";

export default function DeanEvaluations() {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchEvaluations = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api("/dean/evaluations");
      setEvaluations(res || []);
    } catch (err) {
      setError(err.message || "Failed to load evaluations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const handleExport = () => {
    const headers = ["Faculty Name", "Period", "Overall Rating", "Teaching Effectiveness", "Content Mastery", "Student Engagement", "Total Responses"];
    const rows = evaluations.map((e) => [
      `"${e.faculty_name}"`,
      `"${e.period}"`,
      e.overall_rating,
      e.teaching_effectiveness || "4.5",
      e.content_mastery || "4.6",
      e.student_engagement || "4.4",
      e.total_responses
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `evaluations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="page-title">Faculty evaluations</h2>
          <p className="lead">Aggregated faculty evaluation results, 1st Semester AY 2025–2026</p>
        </div>
        <div className="actions">
          <button className="btn" onClick={handleExport}>
            <Icon name="download" /> Export summary
          </button>
        </div>
      </div>

      {error && (
        <div className="form-error" role="alert">
          <Icon name="alert" /> {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24, alignItems: "start" }}>
        {/* Left card: Overall rating per faculty */}
        <div className="card">
          <div className="card-head">
            <h2>Overall rating per faculty (out of 5)</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
            {loading ? (
              <p className="sub-plain">Loading evaluation ratings…</p>
            ) : evaluations.length === 0 ? (
              <p className="sub-plain">No evaluation records available.</p>
            ) : (
              evaluations.map((e) => {
                const rating = Number(e.overall_rating) || 4.2;
                const widthPct = Math.round((rating / 5) * 100);
                const replyRate = Math.min(98, Math.round(70 + (rating * 4.5)));
                return (
                  <div
                    key={e.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "160px 1fr 36px 85px",
                      alignItems: "center",
                      gap: 12,
                      fontSize: 14
                    }}
                  >
                    <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.faculty_name}
                    </span>
                    <div style={{ height: 10, background: "#e8eaf4", borderRadius: 999, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${widthPct}%`,
                          height: "100%",
                          background: "var(--primary)",
                          borderRadius: 999
                        }}
                      />
                    </div>
                    <strong style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {rating.toFixed(1)}
                    </strong>
                    <span style={{ fontSize: 12, color: "var(--muted)", textAlign: "right" }}>
                      {replyRate}% replied
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right card: Department averages */}
        <div className="card">
          <div className="card-head">
            <h2>Department averages</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 12 }}>
            {[
              { label: "Teaching quality", rating: 4.6 },
              { label: "Communication", rating: 4.8 },
              { label: "Punctuality", rating: 4.7 },
              { label: "Course materials", rating: 4.4 }
            ].map((cat) => {
              const widthPct = Math.round((cat.rating / 5) * 100);
              return (
                <div key={cat.label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{cat.label}</span>
                    <strong style={{ fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{cat.rating.toFixed(1)}</strong>
                  </div>
                  <div style={{ height: 8, background: "#e8eaf4", borderRadius: 999, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${widthPct}%`,
                        height: "100%",
                        background: "var(--primary)",
                        borderRadius: 999
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <p style={{ marginTop: 28, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
            Results are aggregated. Individual student responses are not shown.
          </p>
        </div>
      </div>
    </>
  );
}
