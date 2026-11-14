import Icon from "./Icon.jsx";

// current is 1-based
export default function Stepper({ steps, current }) {
  return (
    <ol className="stepper" aria-label="Progress">
      {steps.map((s, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "current" : "todo";
        return (
          <li key={s} className={state} aria-current={state === "current" ? "step" : undefined}>
            <span className="stepper-dot">{state === "done" ? <Icon name="check" /> : n}</span>
            <span className="stepper-label">{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
