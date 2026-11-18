import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import { useAuth } from "./auth.jsx";

// Loads students, faculty and the latest import from the API once the registrar is signed in.
const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

export function StoreProvider({ children }) {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [latestImport, setLatestImport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s, f, i] = await Promise.all([api("/students"), api("/faculty"), api("/imports/latest")]);
      setStudents(s);
      setFaculty(f);
      setLatestImport(i);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const signedIn = Boolean(user) && user?.role === "Registrar";
  useEffect(() => {
    if (signedIn) reload();
    else { setStudents([]); setFaculty([]); setLatestImport(null); setError(""); }
  }, [signedIn, reload]);

  // Creates one account. Throws ApiError (with .fields) when the server rejects it.
  const addPerson = useCallback(async (person) => {
    const { emailed, ...created } = await api("/people", { method: "POST", body: person });
    if (person.role === "Student") setStudents((l) => [created, ...l]);
    if (person.role === "Faculty") setFaculty((l) => [created, ...l]);
    return { ...created, emailed };
  }, []);

  // Saves edited details. Throws ApiError (with .fields) when the server rejects them.
  const updatePerson = useCallback(async (kind, no, details) => {
    const updated = await api(`/people/${encodeURIComponent(no)}`, { method: "PUT", body: details });
    const replace = (list) => list.map((p) => (p.no === no ? updated : p));
    if (kind === "students") setStudents(replace);
    else setFaculty(replace);
    return updated;
  }, []);

  // action: "reset" | "deactivate" | "reactivate"
  const applyAction = useCallback(async (kind, no, action) => {
    const { status, emailed } = await api(`/people/${encodeURIComponent(no)}/status`, { method: "PATCH", body: { action } });
    const update = (list) => list.map((p) => (p.no === no ? { ...p, status } : p));
    if (kind === "students") setStudents(update);
    else setFaculty(update);
    return { status, emailed };
  }, []);

  const value = useMemo(
    () => ({ students, faculty, latestImport, loading, error, reload, addPerson, updatePerson, applyAction }),
    [students, faculty, latestImport, loading, error, reload, addPerson, updatePerson, applyAction]
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
