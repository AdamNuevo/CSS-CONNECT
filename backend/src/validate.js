// Validation rules shared by "add person" and CSV import. The server is the source of truth:
// anything the browser sends is re-checked here.

export const PROGRAMS = ["BSIT", "BSIS", "BSCS"];
export const ACAD_STATUSES = ["Regular", "Irregular", "INC", "UD", "OD", "OW"];
export const DEPARTMENTS = ["IT Program", "IS Program", "CS Program"];
export const ROLES = ["Student", "Faculty", "Dean"];

// any normal email address: university (@qcu.edu.ph) or personal (e.g. @gmail.com)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const ID_RE = /^[A-Za-z0-9-]{3,32}$/;

// Accepts strings and plain numbers (JSON clients send year as 1 or "1"); anything else counts as empty.
const str = (v) => (typeof v === "string" ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : "");
const pick = (list, v) => list.find((x) => x.toLowerCase() === str(v).toLowerCase());

/**
 * Returns { value, errors } where errors maps a field name to a message and `check` is the
 * short label shown in the import review table (first problem found).
 */
export function validatePerson(input) {
  const errors = {};
  let check = "Ready";
  const fail = (field, message, label) => {
    errors[field] = message;
    if (check === "Ready") check = label;
  };

  const role = pick(ROLES, input.role || "Student");
  if (!role) fail("role", "Role must be Student, Faculty or Dean.", "Invalid role");

  const id = str(input.id);
  if (!id) fail("id", "Enter the ID number.", "Missing ID");
  else if (!ID_RE.test(id)) fail("id", "Use 3-32 letters, numbers or dashes.", "Invalid ID");

  const name = str(input.name);
  if (!name) fail("name", "Enter the person's full name.", "Missing name");
  else if (name.length > 120) fail("name", "Name is too long.", "Invalid name");

  const email = str(input.email).toLowerCase();
  if (!email) fail("email", "Enter an email address.", "Invalid email");
  else if (email.length > 254 || !EMAIL_RE.test(email)) fail("email", "Enter a valid email, e.g. name@qcu.edu.ph or name@gmail.com.", "Invalid email");

  const value = { role, id, name, email, photo: str(input.photo) };

  if (role === "Student") {
    const program = pick(PROGRAMS, input.program);
    if (!program) fail("program", "Program must be BSIT, BSIS or BSCS.", "Invalid program");
    const year = Number(str(input.year));
    if (![1, 2, 3, 4].includes(year)) fail("year", "Year level must be 1 to 4.", "Invalid year");
    const section = str(input.section).toUpperCase();
    if (!section) fail("section", "Enter the section.", "Missing section");
    else if (!/^[A-Z0-9]{1,3}$/.test(section)) fail("section", "Section should be 1-3 letters or numbers.", "Invalid section");
    const acad = str(input.acad) ? pick(ACAD_STATUSES, input.acad) : "Regular";
    if (!acad) fail("acad", "Academic status is not recognised.", "Invalid status");
    Object.assign(value, { program, year, section, acad });
  } else if (role) {
    const dept = pick(DEPARTMENTS, input.dept);
    if (!dept) fail("dept", "Choose a department.", "Invalid department");
    Object.assign(value, { dept });
    if (role === "Faculty") {
      const position = str(input.position);
      if (!position) fail("position", "Enter the academic position.", "Missing position");
      Object.assign(value, { position, spec: str(input.spec) });
    }
  }

  return { value, errors, check };
}

// Photos arrive as data URLs and are stored as-is. Only common raster types, capped at 2 MB.
const PHOTO_RE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/;
export const MAX_PHOTO_CHARS = 2.8 * 1024 * 1024; // ~2 MB of image once base64 is decoded
export function validPhoto(photo) {
  return typeof photo === "string" && photo.length <= MAX_PHOTO_CHARS && PHOTO_RE.test(photo);
}
