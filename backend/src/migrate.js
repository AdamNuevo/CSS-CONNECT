import bcrypt from "bcryptjs";
import { pool, query } from "./db.js";
import { demoPeople } from "./demo.js";

const SCHEMA = `
create table if not exists accounts (
  id serial primary key,
  id_number text not null,
  full_name text not null,
  email text not null,
  role text not null check (role in ('Registrar', 'Student', 'Faculty', 'Dean')),
  password_hash text,
  status text not null default 'Not signed in'
    check (status in ('Activated', 'Not signed in', 'Reset requested', 'Deactivated')),
  program text,
  year_level int,
  section text,
  acad_status text,
  department text,
  position text,
  specialization text,
  photo text,
  created_at timestamptz not null default now()
);
create unique index if not exists accounts_id_number_uq on accounts (lower(id_number));
create unique index if not exists accounts_email_uq on accounts (lower(email));
create index if not exists accounts_role_idx on accounts (role);

create table if not exists imports (
  id serial primary key,
  filename text not null,
  imported int not null,
  skipped int not null,
  created_at timestamptz not null default now()
);

create table if not exists activity (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor_id int references accounts(id) on delete set null,
  actor_name text not null,
  action text not null,
  target_id text,
  target_name text,
  detail text
);
create index if not exists activity_at_idx on activity (at desc, id desc);
`;

export const INSERT_ACCOUNT = `
  insert into accounts
    (id_number, full_name, email, role, status, program, year_level, section, acad_status, department, position, specialization, photo, created_at)
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, coalesce($14::timestamptz, now()))
  on conflict do nothing
  returning id`;

// Maps a validated person (see validate.js) to INSERT_ACCOUNT parameters.
export const accountParams = (p, status = "Not signed in", created = null) => [
  p.id, p.name, p.email, p.role, status,
  p.program ?? null, p.year ?? null, p.section ?? null, p.acad ?? null,
  p.dept ?? null, p.position ?? null, p.spec || null,
  p.photo || null, created
];

export async function migrate() {
  await query(SCHEMA);

  const { rows: reg } = await query("select 1 from accounts where role = 'Registrar' limit 1");
  if (!reg.length) {
    const email = (process.env.SEED_REGISTRAR_EMAIL || "rosa.alvarez@qcu.edu.ph").toLowerCase();
    const password = process.env.SEED_REGISTRAR_PASSWORD;
    if (!password || password.length < 8) throw new Error("Set SEED_REGISTRAR_PASSWORD (at least 8 characters) to create the first registrar account.");
    const hash = await bcrypt.hash(password, 10);
    await query(
      "insert into accounts (id_number, full_name, email, role, status, password_hash, department) values ($1, $2, $3, 'Registrar', 'Activated', $4, $5)",
      ["REG-001", "Ms. Rosa Alvarez", email, hash, "Registrar's Office"]
    );
    console.log(`Created registrar account ${email}`);
  }

  if (process.env.SEED_DEMO === "true") {
    const { rows } = await query("select 1 from accounts where role = 'Student' limit 1");
    if (!rows.length) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        for (const p of demoPeople()) await client.query(INSERT_ACCOUNT, accountParams(p, p.status, p.created));
        await client.query("insert into imports (filename, imported, skipped, created_at) select 'students-2025-2026.csv', count(*), 3, '2026-11-05' from accounts where role = 'Student'");
        await client.query("commit");
        console.log("Loaded demo data");
      } catch (err) {
        await client.query("rollback");
        throw err;
      } finally {
        client.release();
      }
    }
  }
}
