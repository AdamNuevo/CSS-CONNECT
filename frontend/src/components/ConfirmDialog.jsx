import { useEffect, useRef } from "react";

// Modal confirmation. Escape or a click on the backdrop cancels (unless busy); Tab stays inside;
// focus returns to where it was when the dialog closes.
export default function ConfirmDialog({ open, title, children, confirmLabel = "Confirm", danger = false, busy = false, onConfirm, onCancel }) {
  const cancelRef = useRef();
  const dialogRef = useRef();
  // keep the latest callbacks without re-running the focus effect on every parent render
  const latest = useRef({ onCancel, busy });
  latest.current = { onCancel, busy };

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !latest.current.busy) latest.current.onCancel();
      if (e.key === "Tab") {
        const els = [...dialogRef.current.querySelectorAll("button:not([disabled])")];
        if (!els.length) return;
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle" ref={dialogRef}>
        <h2 id="modalTitle">{title}</h2>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">
          <button className="btn" ref={cancelRef} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={"btn " + (danger ? "danger-solid" : "primary")} onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
