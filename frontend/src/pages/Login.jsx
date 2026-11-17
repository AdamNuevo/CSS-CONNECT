import { useState } from "react";
import Icon from "../components/Icon.jsx";
import { useAuth } from "../auth.jsx";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setBusy(true);
    try {
      await login(email.trim(), password); // on success the router redirects to the dashboard
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <aside className="login-panel">
        <div className="login-brand">
          <img className="brand-logo large" src="/qcu-logo.png" alt="" width="52" height="52" />
          <div><strong>CCS Connect</strong><small>Quezon City University</small></div>
        </div>
        <div>
          <h2>One place for the College of Computer Studies.</h2>
          <p>Create and manage student, faculty and dean accounts for BSIT, BSIS and BSCS.</p>
        </div>
        <small className="login-foot">College of Computer Studies · Staff portal</small>
      </aside>

      <main className="login-main">
        <form className="login-form" onSubmit={submit} noValidate>
          <h1>Sign in</h1>
          <p className="lead">Use your university account to continue.</p>

          <div className="group">
            <label htmlFor="loginEmail">University email</label>
            <input
              id="loginEmail"
              className={"input" + (error ? " invalid" : "")}
              type="email"
              placeholder="name@qcu.edu.ph"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
            />
          </div>
          <div className="group">
            <label htmlFor="loginPassword">Password</label>
            <div className="input-wrap">
              <input
                id="loginPassword"
                className={"input" + (error ? " invalid" : "")}
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
              />
              <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
                <Icon name={show ? "eye-off" : "eye"} />
              </button>
            </div>
          </div>

          {error && <p className="form-error" role="alert"><Icon name="alert" />{error}</p>}

          <button type="submit" className="btn primary lg login-btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>

          <div className="info"><Icon name="lock" />For registrar staff and the dean. Students and faculty sign in through their own apps.</div>
        </form>
      </main>
    </div>
  );
}
