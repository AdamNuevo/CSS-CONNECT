import { useState } from "react";
import Icon from "../components/Icon.jsx";
import AuthShell, { AuthField } from "../components/AuthShell.jsx";
import { useAuth } from "../auth.jsx";

const RULES = [
  { text: "At least 8 characters", ok: (p) => p.length >= 8 },
  { text: "One uppercase letter", ok: (p) => /[A-Z]/.test(p) },
  { text: "One number", ok: (p) => /[0-9]/.test(p) }
];

// Shown right after signing in with a temporary or default password; the portal stays locked until it's done.
export default function SetPassword() {
  const { changePassword, logout } = useAuth();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setErrors((er) => ({ ...er, [key]: "" })); };
  const toggle = (key) => () => setShow((s) => ({ ...s, [key]: !s[key] }));
  const allOk = RULES.every((r) => r.ok(form.next));

  async function submit(e) {
    e.preventDefault();
    const er = {};
    if (!form.current) er.current = "Enter the temporary password from your email.";
    if (!allOk) er.next = "Your new password doesn't meet the rules below.";
    if (!form.confirm) er.confirm = "Re-enter your new password.";
    else if (form.confirm !== form.next) er.confirm = "The passwords don't match.";
    if (Object.keys(er).length) return setErrors(er);
    setBusy(true);
    try {
      await changePassword(form.current, form.next); // on success the router opens the portal
    } catch (err) {
      const f = err.fields || {};
      setErrors({ current: f.currentPassword, next: f.newPassword, form: f.currentPassword || f.newPassword ? "" : err.message });
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Set your password">
      <form onSubmit={submit} noValidate>
        <h1>Set your password</h1>
        <p className="auth-lead">Replace the temporary password before you continue.</p>
        {errors.form && <p className="form-error" role="alert"><Icon name="alert" />{errors.form}</p>}

        <AuthField id="spCurrent" label="Temporary password" icon="lock" password show={show.current} onToggle={toggle("current")}
          placeholder="From your email" autoComplete="current-password" autoFocus error={errors.current} value={form.current} onChange={set("current")} />
        <AuthField id="spNew" label="New password" icon="lock" password show={show.next} onToggle={toggle("next")}
          placeholder="Create a new password" autoComplete="new-password" error={errors.next} value={form.next} onChange={set("next")} />
        <AuthField id="spConfirm" label="Confirm new password" icon="lock" password show={show.confirm} onToggle={toggle("confirm")}
          placeholder="Re-enter new password" autoComplete="new-password" error={errors.confirm} value={form.confirm} onChange={set("confirm")} />

        <div className="pw-rules" aria-live="polite">
          <strong>Your password must have:</strong>
          <ul>
            {RULES.map((r) => {
              const ok = r.ok(form.next);
              return <li key={r.text} className={ok ? "ok" : ""}><Icon name={ok ? "check" : "circle"} />{r.text}<span className="sr-only">{ok ? " (done)" : ""}</span></li>;
            })}
          </ul>
        </div>

        <button type="submit" className="btn primary lg auth-btn" disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
        <p className="auth-note"><button type="button" className="auth-link" onClick={logout}>Sign out</button></p>
      </form>
    </AuthShell>
  );
}
