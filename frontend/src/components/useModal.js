import { useEffect, useRef } from "react";

/**
 * Keyboard behaviour shared by every dialog: focus moves in when it opens (to the element marked
 * data-autofocus, else the first control), Tab stays inside, Escape closes it unless `busy`, and
 * focus goes back to where it was on close.
 */
export default function useModal({ open, ref, onClose, busy = false }) {
  // keep the latest callbacks without re-running the focus effect on every parent render
  const latest = useRef({ onClose, busy });
  latest.current = { onClose, busy };

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const root = ref.current;
    (root?.querySelector("[data-autofocus]") ?? root?.querySelector("input, select, button:not([disabled])"))?.focus();

    const onKey = (e) => {
      if (e.key === "Escape" && !latest.current.busy) latest.current.onClose();
      if (e.key !== "Tab" || !ref.current) return;
      const els = [...ref.current.querySelectorAll("input:not([type=hidden]), select, button:not([disabled])")];
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [open, ref]);
}
