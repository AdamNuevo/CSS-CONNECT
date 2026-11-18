import { useRef, useState } from "react";
import Icon from "./Icon.jsx";

// Round the axis up to a clean number with at most ~4 gridlines.
function niceScale(max) {
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500].find((s) => max / s <= 4) || 1000;
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks = [];
  for (let t = 0; t <= top; t += step) ticks.push(t);
  return { top, ticks };
}

/**
 * Single-series bar chart card with hover/focus tooltips and a table view.
 * data: [{ label, value }]   orientation: "horizontal" (ranked bars) | "vertical" (columns)
 */
export default function BarChart({ title, subtitle, data, orientation = "horizontal", unit = "students" }) {
  const [view, setView] = useState("chart");
  const [tip, setTip] = useState(null);
  const wrap = useRef();

  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  const { top, ticks } = niceScale(max);

  const place = (x, y, d) => setTip({ x, y, label: d.label, value: d.value });
  const onMove = (d) => (e) => {
    const r = wrap.current.getBoundingClientRect();
    place(e.clientX - r.left, e.clientY - r.top, d);
  };
  const onFocus = (d) => (e) => {
    const r = wrap.current.getBoundingClientRect();
    const b = e.currentTarget.getBoundingClientRect();
    place(b.left + b.width / 2 - r.left, b.top - r.top, d);
  };
  const hide = () => setTip(null);

  const markProps = (d) => ({
    tabIndex: 0,
    role: "img",
    "aria-label": `${d.label}: ${d.value.toLocaleString()} ${unit}`,
    onPointerMove: onMove(d),
    onPointerLeave: hide,
    onFocus: onFocus(d),
    onBlur: hide
  });

  return (
    <section className="card chart-card">
      <div className="card-head">
        <div>
          <h2>{title}</h2>
          <p className="sub-plain">{subtitle}</p>
        </div>
        <div className="seg" role="group" aria-label={`${title} view`}>
          <button className={view === "chart" ? "active" : ""} aria-pressed={view === "chart"} onClick={() => setView("chart")} aria-label="Chart view"><Icon name="chart" /></button>
          <button className={view === "table" ? "active" : ""} aria-pressed={view === "table"} onClick={() => setView("table")} aria-label="Table view"><Icon name="table" /></button>
        </div>
      </div>

      {view === "table" ? (
        <table className="table compact">
          <caption className="sr-only">{title}</caption>
          <thead><tr><th scope="col">{orientation === "vertical" ? "Level" : "Program"}</th><th scope="col" className="num">Students</th><th scope="col" className="num">Share</th></tr></thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label}><td>{d.label}</td><td className="num">{d.value.toLocaleString()}</td><td className="num">{total ? Math.round((d.value / total) * 100) : 0}%</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className={"chart-wrap" + (tip ? " has-active" : "")} ref={wrap}>
          {orientation === "horizontal" ? (
            <div className="hbars">
              {data.map((d, i) => (
                <div className="hbar-row" key={d.label}>
                  <span className="hbar-label">{d.label}</span>
                  <div className="hbar-plot">
                    <span className={"hbar-bar" + (tip?.label === d.label ? " is-active" : "")} style={{ width: `calc((100% - 44px) * ${d.value / max})`, animationDelay: `${i * 70}ms` }} {...markProps(d)} />
                    <span className="hbar-value">{d.value.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="vchart">
              <div className="vchart-plot">
                {ticks.map((t) => (
                  <div className="vchart-grid" key={t} style={{ bottom: `${(t / top) * 100}%` }}><span>{t}</span></div>
                ))}
                <div className="vchart-cols">
                  {data.map((d, i) => (
                    <div className={"vchart-col" + (tip?.label === d.label ? " is-active" : "")} key={d.label}>
                      <span className="vchart-value">{d.value.toLocaleString()}</span>
                      <span className={"vchart-bar" + (tip?.label === d.label ? " is-active" : "")} style={{ height: `${(d.value / top) * 100}%`, animationDelay: `${i * 70}ms` }} {...markProps(d)} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="vchart-labels">
                {data.map((d) => <span key={d.label}>{d.label}</span>)}
              </div>
            </div>
          )}

          {tip && (
            <div className="tooltip" style={{ left: tip.x, top: tip.y }} role="presentation">
              <strong>{tip.value.toLocaleString()} {unit}</strong>
              <span>{tip.label} · {total ? Math.round((tip.value / total) * 100) : 0}%</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
