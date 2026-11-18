import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { pool, query } from "../db.js";
import { INSERT_ACCOUNT, accountParams } from "../migrate.js";
import { validatePerson } from "../validate.js";
import { logActivity } from "../activity.js";
import { mailEnabled, sendLoginDetailsInBackground } from "../mail.js";

const router = Router();
const MAX_ROWS = 2000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

// CSV header -> field name used by validatePerson. Extra columns are ignored.
const COLUMN_ALIASES = {
  id_number: "id", id: "id",
  full_name: "name", name: "name",
  email: "email",
  role: "role",
  program: "program", year: "year", section: "section",
  academic_status: "acad", acad: "acad",
  department: "dept", dept: "dept",
  position: "position",
  specialization: "spec", spec: "spec"
};
const REQUIRED = ["id", "name", "email"];

// Unknown headers (including odd ones like "__proto__" or "constructor") map to false = ignored.
const fieldFor = (header) => {
  const key = header.trim().toLowerCase().replace(/\s+/g, "_");
  return Object.hasOwn(COLUMN_ALIASES, key) ? COLUMN_ALIASES[key] : false;
};

function readCsv(buffer) {
  let records;
  try {
    records = parse(buffer, { columns: (h) => h.map(fieldFor), skip_empty_lines: true, trim: true, bom: true, relax_column_count: true });
  } catch {
    return { error: "We couldn't read that file. Check that it is a CSV saved from the template." };
  }
  if (!records.length) return { error: "The file has no rows." };
  const present = new Set(Object.keys(records[0]));
  const missing = REQUIRED.filter((c) => !present.has(c));
  if (missing.length) return { error: `The file is missing a column: ${missing.map((m) => ({ id: "id_number", name: "full_name", email: "email" }[m])).join(", ")}.` };
  if (records.length > MAX_ROWS) return { error: `The file has more than ${MAX_ROWS.toLocaleString()} rows. Split it and import in parts.` };
  return { records };
}

// Which of these IDs / emails already exist in the database?
async function existing(people) {
  const ids = people.map((p) => p.id.toLowerCase()).filter(Boolean);
  const emails = people.map((p) => p.email.toLowerCase()).filter(Boolean);
  const { rows } = await query(
    "select lower(id_number) as id, lower(email) as email from accounts where lower(id_number) = any($1) or lower(email) = any($2)",
    [ids, emails]
  );
  return { ids: new Set(rows.map((r) => r.id)), emails: new Set(rows.map((r) => r.email)) };
}

// Validates every row, then marks duplicates (inside the file or already in the database).
async function checkRows(inputs) {
  const results = inputs.map((input) => validatePerson(input));
  const db = await existing(results.map((r) => r.value));
  const seenIds = new Set();
  const seenEmails = new Set();
  for (const r of results) {
    const id = r.value.id.toLowerCase();
    const email = r.value.email.toLowerCase();
    if (r.check === "Ready") {
      if (db.ids.has(id)) r.check = "ID already exists";
      else if (seenIds.has(id)) r.check = "Duplicate ID";
      else if (db.emails.has(email)) r.check = "Email already exists";
      else if (seenEmails.has(email)) r.check = "Duplicate email";
    }
    if (r.check === "Ready") { seenIds.add(id); seenEmails.add(email); }
  }
  return results;
}

const summary = (input, value) =>
  value.role === "Student" || !value.role
    ? [input.program, [input.year, input.section].filter(Boolean).join("-")].filter(Boolean).join(" ")
    : input.dept || "";

router.post("/import/preview", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Choose a CSV file to upload." });
  if (!/\.csv$/i.test(req.file.originalname)) return res.status(400).json({ error: "Please choose a .csv file." });

  const { records, error } = readCsv(req.file.buffer);
  if (error) return res.status(400).json({ error });

  const results = await checkRows(records);
  res.json({
    fileName: req.file.originalname.slice(0, 100),
    rows: results.map((r, i) => ({
      row: i + 2, // row 1 is the header
      id: r.value.id,
      name: r.value.name,
      email: r.value.email,
      prog: summary(records[i], r.value),
      check: r.check,
      // sent back on commit; validated again there
      data: r.check === "Ready" ? r.value : null
    }))
  });
});

router.post("/import/commit", async (req, res) => {
  const rows = req.body?.rows;
  if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ error: "There are no rows to create." });
  if (rows.length > MAX_ROWS) return res.status(400).json({ error: `Too many rows (max ${MAX_ROWS.toLocaleString()}).` });

  // never trust what the browser sends: validate and de-duplicate again
  const results = await checkRows(rows.map((r) => (r && typeof r === "object" ? r : {})));
  const ready = results.filter((r) => r.check === "Ready");

  const client = await pool.connect();
  let created = 0;
  const createdPeople = [];
  try {
    await client.query("begin");
    for (const r of ready) {
      const { rowCount } = await client.query(INSERT_ACCOUNT, accountParams(r.value));
      created += rowCount;
      if (rowCount) createdPeople.push({ name: r.value.name, email: r.value.email, idNumber: r.value.id });
    }
    const fileName = typeof req.body.fileName === "string" ? req.body.fileName.replace(/[\u0000-\u001f]/g, "").slice(0, 100) : "import.csv";
    const skipped = Number.isInteger(req.body.skipped) && req.body.skipped >= 0 ? req.body.skipped : rows.length - created;
    await client.query("insert into imports (filename, imported, skipped) values ($1, $2, $3)", [fileName || "import.csv", created, skipped]);
    await logActivity(req.account, "import", { detail: `${fileName || "import.csv"}: ${created} created, ${skipped} skipped` }, client);
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
  // email everyone their login details only after the import is safely saved
  sendLoginDetailsInBackground(createdPeople);
  res.status(201).json({ created, skipped: rows.length - created, emailing: mailEnabled ? createdPeople.length : 0 });
});

export default router;
