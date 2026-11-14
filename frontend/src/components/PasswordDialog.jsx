import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { useToast } from "./Toast.jsx";

// Modal form for changing your own password.
export default function PasswordDialog({ open, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef();
  const latest = useRef({ onClose, busy });
  latest.current = { onClose, busy };

  useEffect(() => {
    if (!open) return;
    setForm({ currentPassword: "", newPassword: "", confirm: "" });
    setErrors({});
    const previous = document.activeElement;
    dialogRef.current?.querySelector("input")?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !latest.current.busy) latest.current.onClose();
      if (e.key === "Tab") {
        const els = [...dialogRef.current.querySelectorAll("input, button:not([disabled])")];
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [open]);

  if (!open) return null;

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: "" }));
  };

  async function submit(e) {
    e.preventDefault();
    const er = {};
    if (!form.currentPassword) er.currentPassword = "Enter your current password.";
    if (form.newPassword.length < 8) er.newPassword = "Use at least 8 characters.";
    else if (form.newPassword === form.currentPassword) er.newPassword = "Choose a password you haven't used here.";
    if (form.confirm !== form.newPassword) er.confirm = "Passwords don't match.";
    if (Object.keys(er).length) return setErrors(er);

    setBusy(true);
    try {
      await api("/auth/change-password", { method: "POST", body: { currentPassword: form.currentPassword, newPassword: form.newPassword } });
      toast("Password changed");
      onClose();
    } catch (err) {
      if (Object.keys(err.fields || {}).length) setErrors(err.fields);
      else toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  const field = (key, label, autoComplete) => (
    <div className="group">
      <label htmlFor={"pw-" + key}>{label}</label>
      <input
        id={"pw-" + key}
        type="password"
        className={"input" + (errors[key] ? " invalid" : "")}
        autoComplete={autoComplete}
        value={form[key]}
        onChange={set(key)}
        aria-invalid={errors[key] ? true : undefined}
      />
      {errors[key] && <p className="field-error">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="pwTitle" ref={dialogRef} onSubmit={submit} noValidate>
        <h2 id="pwTitle">Change password</h2>
        <div className="modal-fields">
          {field("currentPassword", "Current password", "current-password")}
          {field("newPassword", "New password", "new-password")}
          {field("confirm", "Confirm new password", "new-password")}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? "Saving…" : "Change password"}</button>
        </div>
      </form>
    </div>
  );
}
