import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";

// Kebab menu for table rows. items: [{ label, onSelect, danger? }]
export default function RowMenu({ label, items }) {
  const [open, setOpen] = useState(false);
  const root = useRef();

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className="row-menu" ref={root}>
      <button className="icon-btn" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="more" />
      </button>
      {open && (
        <ul className="menu" role="menu">
          {items.map((it) => (
            <li key={it.label} role="none">
              <button role="menuitem" className={it.danger ? "danger" : ""} onClick={() => { setOpen(false); it.onSelect(); }}>{it.label}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
