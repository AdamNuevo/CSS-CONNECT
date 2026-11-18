import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import AuthShell, { AuthField } from "../components/AuthShell.jsx";
import { api } from "../api.js";

const RESEND_WAIT = 30; // seconds before "Resend email" works again

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (!wait) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function send(e) {
    e?.preventDefault();
    const value = email.trim();
    if (!value) return setError("Enter your email.");
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value)) return setError("Enter a valid email address.");
    setBusy(true);
    try {
      await api("/auth/forgot-password", { method: "POST", body: { email: value } });
      setSent(true);
      setWait(RESEND_WAIT);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your email">
        <span className="auth-badge"><Icon name="mail" /></span>
        <h1>Check your email</h1>
        <p className="auth-lead">If your details match the CCS list, we sent a temporary password to your email. It expires in 24 hours.</p>
        <ol className="auth-steps">
          <li>Open the email from CCS Hub.</li>
          <li>Sign in with the temporary password.</li>
          <li>Create your own password.</li>
        </ol>
        <Link to="/login" className="btn primary lg auth-btn">Go to sign in</Link>
        <p className="auth-note" aria-live="polite">
          Didn't get it?{" "}
          {wait
            ? <span>Resend in {wait}s</span>
            : <button type="button" className="auth-link" onClick={() => send()} disabled={busy}>{busy ? "Sending…" : "Resend email"}</button>}
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot password">
      <form onSubmit={send} noValidate>
        <Link to="/login" className="auth-back"><Icon name="arrow-left" />Back to sign in</Link>
        <h1>Forgot your password?</h1>
        <p className="auth-lead">Enter your email and we will send you a new temporary password.</p>
        <AuthField
          id="forgotEmail" label="Email" icon="mail" type="email" error={error}
          placeholder="juan.delacruz@qcu.edu.ph" autoComplete="username" autoFocus
          value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
        />
        <button type="submit" className="btn primary lg auth-btn" disabled={busy}>{busy ? "Sending…" : "Send temporary password"}</button>
      </form>
    </AuthShell>
  );
}
