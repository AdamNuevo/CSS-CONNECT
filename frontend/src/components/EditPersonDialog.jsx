import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import Avatar from "./Avatar.jsx";
import useModal from "./useModal.js";
import { useToast } from "./Toast.jsx";
import { useStore } from "../store.jsx";
import { PROGRAMS, ACAD_STATUSES, DEPARTMENTS } from "../data.js";
import { readImage } from "../image.js";

// "BSIT 3-A" -> { program: "BSIT", year: "3", section: "A" }
function fromPerson(kind, p) {
  if (kind === "students") {
    const [program, rest = ""] = p.section.split(" ");
    const [year, ...section] = rest.split("-");
    return { name: p.name, email: p.email, program, year, section: section.join("-"), acad: p.acad };
  }
  return { name: p.name, email: p.email, dept: p.dept, position: p.position || "", spec: p.spec || "" };
}

function Field({ id, label, error, children }) {
  return (
    <div className="group">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <p className="field-error" id={id + "-err"}>{error}</p>}
    </div>
  );
}

/** Edit a student's or faculty member's details. The ID number is shown but can't be changed. */
export default function EditPersonDialog({ open, kind, person, onClose }) {
  const isStudent = kind === "students";
  const toast = useToast();
  const { updatePerson } = useStore();
  const dialogRef = useRef();
  const fileInput = useRef();
  const [form, setForm] = useState({});
  const [photo, setPhoto] = useState(undefined); // undefined = unchanged, "" = remove, else a data URL
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  useModal({ open, ref: dialogRef, onClose, busy });

  // load the person into the form each time the dialog opens
  useEffect(() => {
    if (open && person) {
      setForm(fromPerson(kind, person));
      setPhoto(undefined);
      setErrors({});
    }
  }, [open, person, kind]);

  if (!open || !person) return null;

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: "" }));
  };
  const input = (key, extra) => ({
    id: "edit-" + key,
    className: "input" + (errors[key] ? " invalid" : ""),
    value: form[key] ?? "",
    onChange: set(key),
    "aria-invalid": errors[key] ? true : undefined,
    ...extra
  });

  async function pickPhoto(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try { setPhoto(await readImage(file)); } catch (err) { toast(err.message, "error"); }
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const payload = { ...form };
    if (photo !== undefined) payload.photo = photo;
    setBusy(true);
    try {
      await updatePerson(kind, person.no, payload);
      toast(`Saved changes to ${form.name.trim() || person.name}`);
      onClose();
    } catch (err) {
      if (Object.keys(err.fields || {}).length) {
        setErrors(err.fields);
        toast("Please fix the highlighted fields.", "error");
        document.getElementById("edit-" + Object.keys(err.fields)[0])?.focus();
      } else {
        toast(err.message, "error");
      }
    } finally {
      setBusy(false);
    }
  }

  const shownPhoto = photo === undefined ? person.photo : photo;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <form className="modal wide" role="dialog" aria-modal="true" aria-labelledby="editTitle" ref={dialogRef} onSubmit={submit} noValidate>
        <h2 id="editTitle">Edit {isStudent ? "student" : "faculty"}</h2>

        <div className="photo-pick">
          <Avatar name={form.name || person.name} photo={shownPhoto} size="xl" />
          <div>
            <span className="label">{person.no}</span>
            <div className="photo-actions">
              <button type="button" className="btn" onClick={() => fileInput.current.click()}>
                <Icon name="upload" />{shownPhoto ? "Change photo" : "Upload photo"}
              </button>
              {shownPhoto && <button type="button" className="link" onClick={() => setPhoto("")}>Remove</button>}
            </div>
            <p className="field-hint">The ID number can't be changed.</p>
          </div>
          <input type="file" ref={fileInput} accept="image/*" hidden onChange={pickPhoto} />
        </div>

        <div className="form-grid">
          <Field id="edit-name" label="Full name" error={errors.name}>
            <input {...input("name", { autoComplete: "off" })} data-autofocus />
          </Field>
          <Field id="edit-email" label="Email" error={errors.email}>
            <input {...input("email", { type: "email", autoComplete: "off" })} />
          </Field>

          {isStudent ? (
            <>
              <Field id="edit-program" label="Program" error={errors.program}>
                <select {...input("program")}>{PROGRAMS.map((p) => <option key={p}>{p}</option>)}</select>
              </Field>
              <Field id="edit-year" label="Year level" error={errors.year}>
                <select {...input("year")}>{[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}</select>
              </Field>
              <Field id="edit-section" label="Section" error={errors.section}>
                <input {...input("section", { maxLength: 3 })} />
              </Field>
              <Field id="edit-acad" label="Academic status" error={errors.acad}>
                <select {...input("acad")}>{ACAD_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
              </Field>
            </>
          ) : (
            <>
              <Field id="edit-dept" label="Department / Program" error={errors.dept}>
                <select {...input("dept")}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select>
              </Field>
              <Field id="edit-position" label="Academic position" error={errors.position}>
                <input {...input("position")} />
              </Field>
              <Field id="edit-spec" label="Specialization" error={errors.spec}>
                <input {...input("spec")} />
              </Field>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    </div>
  );
}
