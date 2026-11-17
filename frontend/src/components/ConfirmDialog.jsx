import { useRef } from "react";
import useModal from "./useModal.js";

// Modal confirmation. Escape or a click on the backdrop cancels (unless busy).
export default function ConfirmDialog({ open, title, children, confirmLabel = "Confirm", danger = false, busy = false, onConfirm, onCancel }) {
  const dialogRef = useRef();
  useModal({ open, ref: dialogRef, onClose: onCancel, busy });

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle" ref={dialogRef}>
        <h2 id="modalTitle">{title}</h2>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">
          <button className="btn" data-autofocus onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={"btn " + (danger ? "danger-solid" : "primary")} onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
