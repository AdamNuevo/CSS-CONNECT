import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import Avatar from "../components/Avatar.jsx";
import { useToast } from "../components/Toast.jsx";
import { useStore } from "../store.jsx";
import { PROGRAMS, ACAD_STATUSES, DEPARTMENTS } from "../data.js";
import { readImage } from "../image.js";

const CFG = {
  Student: { label: "Student number", ph: "e.g. 24-0123" },
  Faculty: { label: "Faculty ID", ph: "e.g. FAC-2026-001" },
  Dean: { label: "Employee ID", ph: "e.g. DEAN-001" }
};

const EMPTY = {
  id: "", name: "", email: "", photo: "",
  program: "BSIT", year: "1", section: "", acad: "Regular",
  dept: DEPARTMENTS[0], position: "", spec: ""
};

function Field({ id, label, error, hint, children }) {
  return (
    <div className="group">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <p className="field-error" id={id + "-err"}>{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export default function AddPerson() {
  const toast = useToast();
  const navigate = useNavigate();
  const { students, faculty, addPerson } = useStore();
  const fileInput = useRef();
  const [role, setRole] = useState("Student");
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: "" }));
  };
  const props = (key) => ({
    id: key,
    className: "input" + (errors[key] ? " invalid" : ""),
    value: form[key],
    onChange: set(key),
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? key + "-err" : undefined
  });

  async function pickPhoto(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const photo = await readImage(file);
      setForm((f) => ({ ...f, photo }));
    } catch (err) {
      toast(err.message, "error");
    }
  }

  function validate() {
    const er = {};
    const id = form.id.trim();
    const email = form.email.trim().toLowerCase();
    if (!id) er.id = `Enter the ${CFG[role].label.toLowerCase()}.`;
    else if ([...students, ...faculty].some((p) => p.no.toLowerCase() === id.toLowerCase())) er.id = "This ID already has an account.";
    if (!form.name.trim()) er.name = "Enter the person's full name.";
    if (!email) er.email = "Enter a university email.";
    else if (!/^[^\s@]+@qcu\.edu\.ph$/i.test(email)) er.email = "Use a university email ending in @qcu.edu.ph.";
    else if ([...students, ...faculty].some((p) => p.email.toLowerCase() === email)) er.email = "This email already has an account.";
    if (role === "Student" && !form.section.trim()) er.section = "Required.";
    if (role === "Faculty" && !form.position.trim()) er.position = "Enter the academic position.";
    return er;
  }

  function showErrors(er) {
    setErrors(er);
    toast("Please fix the highlighted fields.", "error");
    document.getElementById(Object.keys(er)[0])?.focus();
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const er = validate(); // quick feedback; the server checks everything again
    if (Object.keys(er).length) return showErrors(er);

    const payload = { role, id: form.id, name: form.name, email: form.email, photo: form.photo };
    if (role === "Student") Object.assign(payload, { program: form.program, year: form.year, section: form.section, acad: form.acad });
    else Object.assign(payload, { dept: form.dept, position: form.position, spec: form.spec });

    setBusy(true);
    try {
      await addPerson(payload);
      toast(`${role} account created for ${form.name.trim()}`);
      setForm(EMPTY);
      if (role === "Student") navigate("/students");
      if (role === "Faculty") navigate("/faculty");
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) showErrors(err.fields);
      else toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2 className="page-title">Add person</h2>
          <p className="lead">Add one person, for example a late enrollee</p>
        </div>
      </div>

      <form className="card form-card" onSubmit={submit} noValidate>
        <div className="group">
          <span className="label">Role</span>
          <div className="seg wide" role="group" aria-label="Role">
            {Object.keys(CFG).map((r) => (
              <button
                key={r}
                type="button"
                className={role === r ? "active" : ""}
                aria-pressed={role === r}
                onClick={() => { setRole(r); setErrors({}); }}
              >{r}</button>
            ))}
          </div>
        </div>

        <div className="photo-pick">
          <Avatar name={form.name || "?"} photo={form.photo} size="xl" />
          <div>
            <span className="label">Profile picture <span className="optional">(optional)</span></span>
            <div className="photo-actions">
              <button type="button" className="btn" onClick={() => fileInput.current.click()}>
                <Icon name="upload" />{form.photo ? "Change photo" : "Upload photo"}
              </button>
              {form.photo && <button type="button" className="link" onClick={() => setForm((f) => ({ ...f, photo: "" }))}>Remove</button>}
            </div>
            <p className="field-hint">JPG or PNG, up to 2 MB</p>
          </div>
          <input type="file" ref={fileInput} accept="image/*" hidden onChange={pickPhoto} />
        </div>

        <div className="form-grid">
          <Field id="id" label={CFG[role].label} error={errors.id}>
            <input {...props("id")} placeholder={CFG[role].ph} autoComplete="off" />
          </Field>
          <Field id="name" label="Full name" error={errors.name}>
            <input {...props("name")} placeholder="e.g. Juan Dela Cruz" autoComplete="off" />
          </Field>
          <Field id="email" label="University email" error={errors.email} hint="Must end in @qcu.edu.ph">
            <input {...props("email")} type="email" placeholder="name@qcu.edu.ph" autoComplete="off" />
          </Field>

          {role === "Student" && (
            <>
              <Field id="program" label="Program">
                <select {...props("program")}>{PROGRAMS.map((p) => <option key={p}>{p}</option>)}</select>
              </Field>
              <Field id="year" label="Year level">
                <select {...props("year")}>{[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}</select>
              </Field>
              <Field id="section" label="Section" error={errors.section}>
                <input {...props("section")} placeholder="A" maxLength={3} />
              </Field>
              <Field id="acad" label="Academic status">
                <select {...props("acad")}>{ACAD_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
              </Field>
            </>
          )}

          {role !== "Student" && (
            <Field id="dept" label="Department / Program">
              <select {...props("dept")}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select>
            </Field>
          )}

          {role === "Faculty" && (
            <>
              <Field id="position" label="Academic position" error={errors.position}>
                <input {...props("position")} placeholder="e.g. Assistant Professor" />
              </Field>
              <Field id="spec" label="Specialization">
                <input {...props("spec")} placeholder="e.g. Artificial Intelligence" />
              </Field>
            </>
          )}
        </div>

        <div className="info"><Icon name="key" />A default password is created automatically. The person must change it the first time they sign in.</div>

        <div className="form-actions">
          <button type="button" className="btn lg" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn primary lg" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
        </div>
      </form>
    </>
  );
}
