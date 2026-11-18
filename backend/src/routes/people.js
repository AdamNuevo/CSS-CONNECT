import { Router } from "express";
import { query } from "../db.js";
import { INSERT_ACCOUNT, accountParams } from "../migrate.js";
import { validatePerson, validPhoto } from "../validate.js";
import { logActivity } from "../activity.js";
import { sendLoginDetails } from "../mail.js";

const router = Router();

const photoUrl = (r) => (r.has_photo ? `/api/photos/${encodeURIComponent(r.id_number)}?v=${r.photo_len}` : "");
const date = (d) => d.toISOString().slice(0, 10);

const toStudent = (r) => ({
  no: r.id_number, name: r.full_name, email: r.email,
  section: `${r.program} ${r.year_level}-${r.section}`,
  acad: r.acad_status, status: r.status, photo: photoUrl(r), created: date(r.created_at)
});
const toFaculty = (r) => ({
  no: r.id_number, name: r.full_name, email: r.email, dept: r.department,
  position: r.position, spec: r.specialization || "", status: r.status, photo: photoUrl(r), created: date(r.created_at)
});
const toDean = (r) => ({ no: r.id_number, name: r.full_name, email: r.email, dept: r.department, status: r.status, photo: photoUrl(r), created: date(r.created_at) });

// photo itself is never selected in list queries; the browser fetches it from /api/photos/:id
const COLUMNS = `id_number, full_name, email, status, program, year_level, section, acad_status, department, position,
  specialization, created_at, (photo is not null) as has_photo, length(photo) as photo_len`;

router.get("/students", async (req, res) => {
  const { rows } = await query(`select ${COLUMNS} from accounts where role = 'Student' order by created_at desc, id desc`);
  res.json(rows.map(toStudent));
});

router.get("/faculty", async (req, res) => {
  const { rows } = await query(`select ${COLUMNS} from accounts where role = 'Faculty' order by created_at desc, id desc`);
  res.json(rows.map(toFaculty));
});

router.get("/imports/latest", async (req, res) => {
  const { rows } = await query("select filename, imported, skipped, created_at from imports order by id desc limit 1");
  const r = rows[0];
  res.json(r ? { file: r.filename, imported: r.imported, skipped: r.skipped, date: date(r.created_at) } : null);
});

router.post("/people", async (req, res) => {
  const { value, errors } = validatePerson(req.body ?? {});
  if (Object.keys(errors).length) return res.status(400).json({ error: "Please fix the highlighted fields.", fields: errors });
  if (value.photo && !validPhoto(value.photo)) {
    return res.status(400).json({ error: "Please fix the highlighted fields.", fields: { photo: "Use a PNG, JPG, WebP or GIF image up to 2 MB." } });
  }

  // INSERT ... ON CONFLICT DO NOTHING returns no row when the ID or email already exists
  const { rows } = await query(INSERT_ACCOUNT, accountParams(value));
  if (!rows.length) {
    const { rows: clash } = await query("select lower(id_number) = lower($1) as same_id from accounts where lower(id_number) = lower($1) or lower(email) = lower($2) limit 1", [value.id, value.email]);
    const sameId = clash[0]?.same_id;
    return res.status(409).json({
      error: sameId ? "This ID already has an account." : "This email already has an account.",
      fields: sameId ? { id: "This ID already has an account." } : { email: "This email already has an account." }
    });
  }

  const { rows: created } = await query(`select ${COLUMNS}, role from accounts where id = $1`, [rows[0].id]);
  const r = created[0];
  await logActivity(req.account, "person_added", { targetId: r.id_number, targetName: r.full_name, detail: r.role });
  const emailed = await sendLoginDetails({ name: r.full_name, email: r.email, idNumber: r.id_number });
  res.status(201).json({ ...(r.role === "Student" ? toStudent(r) : r.role === "Faculty" ? toFaculty(r) : toDean(r)), emailed });
});

// Edit a person's details. The ID number and role can't change (the ID is the key and the default
// password), so they always come from the stored account, never from the request.
router.put("/people/:idNumber", async (req, res) => {
  const { rows: found } = await query(
    `select id, id_number, role, full_name, email, program, year_level, section, acad_status, department, position,
            specialization, (photo is not null) as has_photo
     from accounts where lower(id_number) = lower($1) and role in ('Student', 'Faculty', 'Dean')`,
    [req.params.idNumber]
  );
  const existing = found[0];
  if (!existing) return res.status(404).json({ error: "Account not found." });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const { value, errors } = validatePerson({ ...body, role: existing.role, id: existing.id_number });

  // photo: leave alone if not sent, remove with "", otherwise it must be a valid image
  const photoSent = Object.hasOwn(body, "photo");
  if (photoSent && body.photo !== "" && !validPhoto(body.photo)) errors.photo = "Use a PNG, JPG, WebP or GIF image up to 2 MB.";
  if (Object.keys(errors).length) return res.status(400).json({ error: "Please fix the highlighted fields.", fields: errors });

  try {
    await query(
      `update accounts set full_name = $1, email = $2, program = $3, year_level = $4, section = $5, acad_status = $6,
         department = $7, position = $8, specialization = $9,
         photo = case when $10::boolean then $11 else photo end
       where id = $12`,
      [value.name, value.email, value.program ?? null, value.year ?? null, value.section ?? null, value.acad ?? null,
        value.dept ?? null, value.position ?? null, value.spec || null, photoSent, body.photo || null, existing.id]
    );
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "This email already has an account.", fields: { email: "This email already has an account." } });
    throw err;
  }

  const { rows } = await query(`select ${COLUMNS}, role from accounts where id = $1`, [existing.id]);
  const r = rows[0];

  // record only the names of the fields that really changed (never the values or the photo itself)
  const changed = [
    ["Name", existing.full_name, value.name], ["Email", existing.email, value.email],
    ["Program", existing.program, value.program ?? null], ["Year", existing.year_level, value.year ?? null],
    ["Section", existing.section, value.section ?? null], ["Academic status", existing.acad_status, value.acad ?? null],
    ["Department", existing.department, value.dept ?? null], ["Position", existing.position, value.position ?? null],
    ["Specialization", existing.specialization, value.spec || null]
  ].filter(([, before, after]) => before !== after).map(([label]) => label);
  if (photoSent && (body.photo ? true : existing.has_photo)) changed.push(body.photo ? "Photo" : "Photo removed");
  if (changed.length) await logActivity(req.account, "person_edited", { targetId: existing.id_number, targetName: value.name, detail: `Changed: ${changed.join(", ")}` });
  res.json(r.role === "Student" ? toStudent(r) : r.role === "Faculty" ? toFaculty(r) : toDean(r));
});

const ACTIONS = {
  reset: { status: "Reset requested", clearPassword: true, log: "password_reset" },
  deactivate: { status: "Deactivated", log: "deactivated" },
  reactivate: { status: "Activated", log: "reactivated" }
};

router.patch("/people/:idNumber/status", async (req, res) => {
  const name = req.body?.action;
  const action = typeof name === "string" && Object.hasOwn(ACTIONS, name) ? ACTIONS[name] : null;
  if (!action) return res.status(400).json({ error: "Unknown action." });

  // the registrar's own account can't be changed from the people lists
  const { rows } = await query(
    `update accounts set status = $1${action.clearPassword ? ", password_hash = null" : ""}
     where lower(id_number) = lower($2) and role in ('Student', 'Faculty', 'Dean')
     returning id_number, full_name, role, email`,
    [action.status, req.params.idNumber]
  );
  if (!rows.length) return res.status(404).json({ error: "Account not found." });
  await logActivity(req.account, action.log, { targetId: rows[0].id_number, targetName: rows[0].full_name, detail: rows[0].role });
  const emailed = name === "reset"
    ? await sendLoginDetails({ name: rows[0].full_name, email: rows[0].email, idNumber: rows[0].id_number }, "reset")
    : false;
  res.json({ status: action.status, emailed });
});

// Profile pictures live in the database as data URLs; serve them as real images.
router.get("/photos/:idNumber", async (req, res) => {
  const { rows } = await query("select photo from accounts where lower(id_number) = lower($1) and photo is not null", [req.params.idNumber]);
  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/.exec(rows[0]?.photo ?? "");
  if (!match) return res.status(404).end();
  // helmet already adds X-Content-Type-Options: nosniff
  res.set({ "Content-Type": match[1], "Cache-Control": "private, max-age=300" });
  res.send(Buffer.from(match[2], "base64"));
});

export default router;
