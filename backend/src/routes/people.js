import { Router } from "express";
import { query } from "../db.js";
import { INSERT_ACCOUNT, accountParams } from "../migrate.js";
import { validatePerson, validPhoto } from "../validate.js";

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
  res.status(201).json(r.role === "Student" ? toStudent(r) : r.role === "Faculty" ? toFaculty(r) : toDean(r));
});

const ACTIONS = {
  reset: { status: "Reset requested", clearPassword: true },
  deactivate: { status: "Deactivated" },
  reactivate: { status: "Activated" }
};

router.patch("/people/:idNumber/status", async (req, res) => {
  const name = req.body?.action;
  const action = typeof name === "string" && Object.hasOwn(ACTIONS, name) ? ACTIONS[name] : null;
  if (!action) return res.status(400).json({ error: "Unknown action." });

  // the registrar's own account can't be changed from the people lists
  const { rowCount } = await query(
    `update accounts set status = $1${action.clearPassword ? ", password_hash = null" : ""}
     where lower(id_number) = lower($2) and role in ('Student', 'Faculty', 'Dean')`,
    [action.status, req.params.idNumber]
  );
  if (!rowCount) return res.status(404).json({ error: "Account not found." });
  res.json({ status: action.status });
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
