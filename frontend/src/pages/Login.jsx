import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import AuthShell, { AuthField } from "../components/AuthShell.jsx";
import { useAuth } from "../auth.jsx";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setBusy(true);
    try {
      await login(email.trim(), password, remember); // on success the router moves on (or to Set password)
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Sign in">
      <form onSubmit={submit} noValidate>
        <h1>Welcome back</h1>
        <p className="auth-lead">Sign in to continue to CCS Hub.</p>

        {error && <p className="form-error" role="alert"><Icon name="alert" />{error}</p>}

        <AuthField
          id="loginEmail" label="Email" icon="mail" type="email" error={!!error}
          placeholder="juan.delacruz@qcu.edu.ph" autoComplete="username" autoFocus
          value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
        />
        <AuthField
          id="loginPassword" label="Password" icon="lock" password show={show} onToggle={() => setShow((s) => !s)} error={!!error}
          placeholder="Enter your password" autoComplete="current-password"
          value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
        />

        <div className="auth-row">
          <label className="check">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Keep me signed in
          </label>
          <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
        </div>

        <button type="submit" className="btn primary lg auth-btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>

        <p className="auth-note">First time signing in? Use the temporary password sent to your email.</p>
      </form>
    </AuthShell>
  );
}
