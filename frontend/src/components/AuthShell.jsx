import { useEffect } from "react";
import Icon from "./Icon.jsx";

const FEATURES = [
  { icon: "calendar", text: "Class schedules and grades" },
  { icon: "qr", text: "Event registration with QR attendance" },
  { icon: "search", text: "Capstone and research repository" },
  { icon: "message-square", text: "Faculty consultation booking" }
];

// Shared frame for Sign in, Forgot password and Set password: brand panel on the left, a card on the right.
export default function AuthShell({ title, children }) {
  useEffect(() => { document.title = `${title} · CCS Hub`; }, [title]);
  return (
    <div className="login">
      <aside className="login-panel">
        <div className="login-brand">
          <img className="brand-logo large" src="/qcu-logo.png" alt="" width="52" height="52" />
          <div><strong>CCS Hub</strong><small>Quezon City University</small></div>
        </div>
        <div className="login-pitch">
          <h2>One place for the College of Computer Studies.</h2>
          <p>Built for students, faculty and the dean.</p>
          <ul className="login-features">
            {FEATURES.map((f) => (
              <li key={f.text}><span className="feat-icon"><Icon name={f.icon} /></span>{f.text}</li>
            ))}
          </ul>
        </div>
        <span aria-hidden="true" />
      </aside>

      <main className="login-main">
        <div className="auth-col">
          <div className="auth-card">{children}</div>
          <p className="auth-foot">College of Computer Studies · Quezon City University</p>
        </div>
      </main>
    </div>
  );
}

// Text input with an icon on the left and an optional Show/Hide button for passwords.
export function AuthField({ id, label, icon, error, password, show, onToggle, type = "text", ...input }) {
  return (
    <div className="group">
      <label htmlFor={id}>{label}</label>
      <div className={"auth-input" + (error ? " invalid" : "")}>
        <Icon name={icon} />
        <input
          id={id}
          className="input"
          type={password ? (show ? "text" : "password") : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error && typeof error === "string" ? id + "-err" : undefined}
          {...input}
        />
        {password && (
          <button type="button" className="show-btn" onClick={onToggle} aria-label={show ? "Hide password" : "Show password"}>
            {show ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {error && typeof error === "string" && <p className="field-error" id={id + "-err"}>{error}</p>}
    </div>
  );
}
