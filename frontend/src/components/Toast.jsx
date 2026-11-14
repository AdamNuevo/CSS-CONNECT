import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";

const ToastContext = createContext(() => {});

// toast("Saved")  ·  toast("Something went wrong", "error")
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [t, setT] = useState({ msg: "", type: "success", show: false });
  const timer = useRef();

  const toast = useCallback((msg, type = "success") => {
    setT({ msg, type, show: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setT((x) => ({ ...x, show: false })), type === "error" ? 4000 : 2600);
  }, []);

  const close = () => { clearTimeout(timer.current); setT((x) => ({ ...x, show: false })); };
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className={`toast ${t.type}${t.show ? " show" : ""}`}
        role={t.type === "error" ? "alert" : "status"}
        aria-live={t.type === "error" ? "assertive" : "polite"}
      >
        <Icon name={t.type === "error" ? "alert" : "check"} />
        <span>{t.msg}</span>
        <button className="toast-close" onClick={close} aria-label="Dismiss"><Icon name="x" /></button>
      </div>
    </ToastContext.Provider>
  );
}
