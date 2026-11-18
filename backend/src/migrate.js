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
create table if not exists announcements (
  id serial primary key,
  title text not null,
  body text not null default '',
  audience text not null default 'All CCS' check (audience in ('All CCS','Students','Faculty','Organizations')),
  status text not null default 'Draft' check (status in ('Draft','Published','Scheduled')),
  publish_date date,
  created_by int references accounts(id),
  created_at timestamptz not null default now()
);
create table if not exists approvals (
  id serial primary key,
  type text not null,
  title text not null,
  details text not null default '',
  submitted_by text not null,
  submitted_at timestamptz not null default now(),
  status text not null default 'Pending' check (status in ('Pending','Approved','Rejected')),
  decided_by int references accounts(id),
  decided_at timestamptz,
  notes text
);
create table if not exists organizations (
  id serial primary key,
  name text not null,
  faculty_adviser_id int references accounts(id),
  officers_count int not null default 0,
  events_count int not null default 0,
  attendance_pct int not null default 0,
  status text not null default 'Active' check (status in ('Active','Inactive')),
  created_at timestamptz not null default now()
);
create table if not exists org_events (
  id serial primary key,
  org_id int not null references organizations(id),
  title text not null,
  event_date date not null,
  created_at timestamptz not null default now()
);
create table if not exists research (
  id serial primary key,
  title text not null,
  researchers text not null,
  program text not null,
  adviser_id int references accounts(id),
  category text not null default 'Web',
  status text not null default 'Under review' check (status in ('Approved','Under review','Needs revision')),
  submitted_at timestamptz not null default now()
);
create table if not exists schedules (
  id serial primary key,
  subject_code text not null,
  subject_name text not null,
  section text not null,
  program text not null,
  year_level int not null,
  faculty_id int references accounts(id),
  room text not null default '',
  day_of_week text not null,
  time_start text not null,
  time_end text not null,
  has_conflict boolean not null default false,
  conflict_note text
);
create table if not exists consultations (
  id serial primary key,
  faculty_id int references accounts(id),
  student_name text not null,
  requested_at timestamptz not null default now(),
  scheduled_at timestamptz,
  status text not null default 'Pending' check (status in ('Pending','Scheduled','Completed','Cancelled')),
  notes text
);
create table if not exists evaluations (
  id serial primary key,
  faculty_id int not null references accounts(id),
  period text not null,
  overall_rating numeric(3,2) not null default 0,
  total_responses int not null default 0,
  teaching_effectiveness numeric(3,2) default 0,
  content_mastery numeric(3,2) default 0,
  student_engagement numeric(3,2) default 0,
  created_at timestamptz not null default now()
);
create table if not exists events (
  id serial primary key,
  title text not null,
  organizer text not null,
  event_date date not null,
  created_at timestamptz not null default now()
);
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
  // "Forgot password" gives a random temporary password that works next to the real one for 24 hours
  await query(`
    alter table accounts add column if not exists temp_password_hash text;
    alter table accounts add column if not exists temp_expires_at timestamptz;`);

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

  // Seed Dean account if no dean exists
  const { rows: dean } = await query("select 1 from accounts where role = 'Dean' limit 1");
  if (!dean.length) {
    await query(
      "insert into accounts (id_number, full_name, email, role, status, password_hash, department) values ($1,$2,$3,'Dean','Activated',$4,$5)",
      ["DEAN-001", "Dr. Elena Marquez", "elena.marquez@qcu.edu.ph", await bcrypt.hash("Dean@12345", 10), "College of Computer Studies"]
    );
    console.log("Created dean account elena.marquez@qcu.edu.ph");
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

    // Seed Dean-portal tables
    const { rows: annCheck } = await query("select 1 from announcements limit 1");
    if (!annCheck.length) {
      await seedDeanData(query);
      console.log("Loaded dean demo data");
    }
  }
}

async function seedDeanData(q) {
  // Get dean and faculty account IDs
  const { rows: deanRows } = await q("select id from accounts where role = 'Dean' limit 1");
  const deanId = deanRows[0]?.id ?? null;
  const { rows: facRows } = await q("select id, full_name from accounts where role = 'Faculty' order by id limit 10");
  const fac = facRows; // array of {id, full_name}
  const fid = (i) => fac[i % fac.length]?.id ?? null;

  // Announcements (5)
  const announcements = [
    ["CCS Year-End Assembly", "All CCS students and faculty are invited to the year-end assembly on December 15 at the College Auditorium.", "All CCS", "Published", "2026-12-15"],
    ["Scholarship Application Open", "The scholarship application for 2nd semester is now open. Submit requirements to the Dean's Office.", "Students", "Published", null],
    ["Faculty Development Seminar", "A mandatory faculty development seminar is scheduled for November 25. Attendance is required.", "Faculty", "Published", "2026-11-25"],
    ["Student Organization Fair", "Organizations are invited to set up booths during the CCS Org Fair on December 5.", "Organizations", "Scheduled", "2026-12-05"],
    ["Curriculum Review Meeting", "Department heads are reminded of the curriculum review meeting on November 18.", "Faculty", "Draft", null],
  ];
  for (const [title, body, audience, status, publish_date] of announcements) {
    await q(
      "insert into announcements (title, body, audience, status, publish_date, created_by) values ($1,$2,$3,$4,$5,$6) on conflict do nothing",
      [title, body, audience, status, publish_date, deanId]
    );
  }

  // Approvals (4 mixed)
  const approvals = [
    ["Event", "CCS Sportsfest 2026", "Request to hold CCS Sportsfest on November 29. Venue: QCU Gymnasium.", "JPIA-QCU", "Pending", null, null, null],
    ["Budget", "Research Equipment Budget Request", "Purchase of 5 Raspberry Pi units for IoT research lab worth PHP 25,000.", "Prof. Paolo Reyes", "Approved", deanId, "2026-11-10", "Approved with the condition that receipt is submitted."],
    ["Event", "Alumni Homecoming Night", "Annual alumni night event scheduled for December 20.", "ACCS-Alumni", "Pending", null, null, null],
    ["Curriculum", "New Elective Subject Proposal", "Proposal to add CS Elective: Cybersecurity Fundamentals for 3rd year BSCS.", "Prof. Ana Villanueva", "Rejected", deanId, "2026-11-08", "Needs further review by the curriculum committee."],
  ];
  for (const [type, title, details, submitted_by, status, decided_by, decided_at, notes] of approvals) {
    await q(
      "insert into approvals (type, title, details, submitted_by, status, decided_by, decided_at, notes) values ($1,$2,$3,$4,$5,$6,$7::timestamptz,$8) on conflict do nothing",
      [type, title, details, submitted_by, status, decided_by, decided_at, notes]
    );
  }

  // Organizations (6)
  const orgs = [
    ["Junior Philippine Institute of Accountants - CCS", fid(0), 12, 5, 87, "Active"],
    ["Google Developer Student Club QCU", fid(1), 15, 8, 92, "Active"],
    ["CCS Student Council", fid(2), 18, 6, 95, "Active"],
    ["Association of Computer Science Students", fid(3), 10, 4, 78, "Active"],
    ["Information Systems Society", fid(4), 11, 3, 81, "Active"],
    ["CCS Photography Club", fid(5), 8, 2, 65, "Inactive"],
  ];
  for (const [name, adviser_id, officers_count, events_count, attendance_pct, status] of orgs) {
    const { rows: orgRow } = await q(
      "insert into organizations (name, faculty_adviser_id, officers_count, events_count, attendance_pct, status) values ($1,$2,$3,$4,$5,$6) on conflict do nothing returning id",
      [name, adviser_id, officers_count, events_count, attendance_pct, status]
    );
    // Add org events for active orgs
    if (orgRow[0]) {
      const orgId = orgRow[0].id;
      await q("insert into org_events (org_id, title, event_date) values ($1,$2,$3) on conflict do nothing",
        [orgId, "General Assembly", "2026-11-15"]);
      await q("insert into org_events (org_id, title, event_date) values ($1,$2,$3) on conflict do nothing",
        [orgId, "Year-End Event", "2026-12-18"]);
    }
  }

  // Research (8 mixed)
  const research = [
    ["Predictive Analytics for Student Academic Performance using Machine Learning", "Juan Dela Cruz, Maria Lopez, Rico Navarro", "BSIT", fid(0), "Machine Learning", "Approved"],
    ["IoT-Based Smart Campus Monitoring System", "Carlo Mendoza, Ana Reyes, Paolo Cruz", "BSIT", fid(1), "IoT", "Approved"],
    ["Automated Curriculum Mapping System for HEIs", "Ella Bautista, Marco Tan", "BSIS", fid(2), "Web", "Under review"],
    ["Blockchain-Based Academic Credential Verification", "Francis Garcia, Hannah Ramos", "BSCS", fid(3), "Blockchain", "Under review"],
    ["Computer Vision-Aided Attendance Monitoring System", "Kevin Mendoza, Lara Castillo", "BSCS", fid(4), "Computer Vision", "Approved"],
    ["Natural Language Processing for Filipino Text Summarization", "Miguel Santiago, Nicole Rivera", "BSCS", fid(0), "NLP", "Needs revision"],
    ["Design and Development of a School Management Information System", "Oscar Flores, Patricia Aquino", "BSIS", fid(1), "Web", "Under review"],
    ["Cybersecurity Risk Assessment Framework for Philippine HEIs", "Samuel Domingo, Trisha Salazar", "BSIT", fid(2), "Security", "Needs revision"],
  ];
  for (const [title, researchers, program, adviser_id, category, status] of research) {
    await q(
      "insert into research (title, researchers, program, adviser_id, category, status) values ($1,$2,$3,$4,$5,$6) on conflict do nothing",
      [title, researchers, program, adviser_id, category, status]
    );
  }

  // Schedules (22 entries, a few with conflicts)
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const schedData = [
    ["IT101", "Introduction to Computing", "A", "BSIT", 1, fid(0), "Lab 1", "Monday", "07:30", "09:00", false, null],
    ["IT101", "Introduction to Computing", "B", "BSIT", 1, fid(0), "Lab 1", "Monday", "09:00", "10:30", false, null],
    ["IT201", "Data Structures and Algorithms", "A", "BSIT", 2, fid(1), "Room 302", "Tuesday", "10:30", "12:00", false, null],
    ["IT201", "Data Structures and Algorithms", "B", "BSIT", 2, fid(1), "Room 302", "Tuesday", "13:00", "14:30", false, null],
    ["IT301", "Network Administration", "A", "BSIT", 3, fid(0), "Net Lab", "Wednesday", "07:30", "09:00", false, null],
    ["IT302", "Web Systems and Technologies", "A", "BSIT", 3, fid(1), "Lab 2", "Wednesday", "09:00", "10:30", false, null],
    ["IT401", "Capstone Project 1", "A", "BSIT", 4, fid(2), "Room 401", "Thursday", "10:30", "12:00", false, null],
    ["CS101", "Discrete Mathematics", "A", "BSCS", 1, fid(3), "Room 201", "Monday", "10:30", "12:00", false, null],
    ["CS201", "Object-Oriented Programming", "A", "BSCS", 2, fid(3), "Lab 3", "Tuesday", "07:30", "09:00", false, null],
    ["CS301", "Artificial Intelligence", "A", "BSCS", 3, fid(4), "Room 303", "Wednesday", "13:00", "14:30", false, null],
    ["CS302", "Machine Learning", "A", "BSCS", 3, fid(4), "Room 303", "Wednesday", "14:30", "16:00", false, null],
    ["CS401", "Software Engineering", "A", "BSCS", 4, fid(0), "Room 402", "Thursday", "07:30", "09:00", false, null],
    ["IS101", "Information Systems Concepts", "A", "BSIS", 1, fid(5), "Room 101", "Monday", "13:00", "14:30", false, null],
    ["IS201", "Systems Analysis and Design", "A", "BSIS", 2, fid(5), "Room 201", "Tuesday", "14:30", "16:00", false, null],
    ["IS301", "Database Management Systems", "A", "BSIS", 3, fid(6), "Lab 4", "Thursday", "09:00", "10:30", false, null],
    ["IS401", "IT Project Management", "A", "BSIS", 4, fid(6), "Room 403", "Friday", "07:30", "09:00", false, null],
    // Conflicts
    ["IT302", "Web Systems and Technologies", "B", "BSIT", 3, fid(1), "Lab 1", "Wednesday", "09:00", "10:30", true, "Room conflict: Lab 1 also used by IT101-B"],
    ["CS301", "Artificial Intelligence", "B", "BSCS", 3, fid(4), "Room 303", "Wednesday", "13:00", "14:30", true, "Faculty conflict: Prof. already teaching CS301-A at same time"],
    ["IT201", "Data Structures and Algorithms", "C", "BSIT", 2, fid(1), "Room 302", "Tuesday", "10:30", "12:00", true, "Faculty conflict: Prof. already teaching IT201-A at same time"],
    ["IS201", "Systems Analysis and Design", "B", "BSIS", 2, fid(5), "Room 201", "Tuesday", "14:30", "16:00", true, "Room conflict: Room 201 also used by IS201-A"],
    ["IT301", "Network Administration", "B", "BSIT", 3, fid(0), "Net Lab", "Wednesday", "07:30", "09:00", true, "Faculty conflict: Prof. already teaching IT301-A at same time"],
    ["CS201", "Object-Oriented Programming", "B", "BSCS", 2, fid(3), "Lab 3", "Tuesday", "07:30", "09:00", false, null],
  ];
  for (const [subject_code, subject_name, section, program, year_level, faculty_id, room, day_of_week, time_start, time_end, has_conflict, conflict_note] of schedData) {
    await q(
      "insert into schedules (subject_code, subject_name, section, program, year_level, faculty_id, room, day_of_week, time_start, time_end, has_conflict, conflict_note) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) on conflict do nothing",
      [subject_code, subject_name, section, program, year_level, faculty_id, room, day_of_week, time_start, time_end, has_conflict, conflict_note]
    );
  }

  // Consultations (10)
  const consultations = [
    [fid(0), "Juan Dela Cruz", "2026-11-10T08:00:00Z", "2026-11-12T09:00:00Z", "Scheduled", "Re: thesis topic approval"],
    [fid(1), "Maria Lopez", "2026-11-11T09:00:00Z", null, "Pending", null],
    [fid(2), "Rico Navarro", "2026-11-05T10:00:00Z", "2026-11-07T10:00:00Z", "Completed", "Discussed INC requirements"],
    [fid(3), "Ella Bautista", "2026-11-12T11:00:00Z", null, "Pending", null],
    [fid(4), "Marco Tan", "2026-11-08T13:00:00Z", "2026-11-09T14:00:00Z", "Completed", "Grade inquiry resolved"],
    [fid(0), "Ana Reyes", "2026-11-13T08:30:00Z", null, "Pending", null],
    [fid(1), "Paolo Cruz", "2026-11-01T09:00:00Z", "2026-11-03T09:30:00Z", "Cancelled", "Student did not attend"],
    [fid(5), "Francis Garcia", "2026-11-14T10:00:00Z", "2026-11-15T10:00:00Z", "Scheduled", "Re: capstone defense schedule"],
    [fid(6), "Hannah Ramos", "2026-11-09T11:00:00Z", "2026-11-11T11:00:00Z", "Completed", "Clearance requirements discussed"],
    [fid(2), "Kevin Mendoza", "2026-11-13T14:00:00Z", null, "Pending", null],
  ];
  for (const [faculty_id, student_name, requested_at, scheduled_at, status, notes] of consultations) {
    await q(
      "insert into consultations (faculty_id, student_name, requested_at, scheduled_at, status, notes) values ($1,$2,$3::timestamptz,$4::timestamptz,$5,$6) on conflict do nothing",
      [faculty_id, student_name, requested_at, scheduled_at, status, notes]
    );
  }

  // Evaluations (one per faculty for current semester)
  const evalData = [
    [fid(0), "1st Semester 2026-2027", 4.52, 48, 4.60, 4.55, 4.40],
    [fid(1), "1st Semester 2026-2027", 4.31, 42, 4.20, 4.35, 4.38],
    [fid(2), "1st Semester 2026-2027", 3.98, 39, 4.00, 3.95, 4.00],
    [fid(3), "1st Semester 2026-2027", 4.75, 51, 4.80, 4.70, 4.75],
    [fid(4), "1st Semester 2026-2027", 4.60, 46, 4.65, 4.58, 4.57],
    [fid(5), "1st Semester 2026-2027", 4.20, 38, 4.15, 4.25, 4.20],
    [fid(6), "1st Semester 2026-2027", 4.45, 43, 4.50, 4.40, 4.45],
  ];
  for (const [faculty_id, period, overall_rating, total_responses, teaching_effectiveness, content_mastery, student_engagement] of evalData) {
    if (!faculty_id) continue;
    await q(
      "insert into evaluations (faculty_id, period, overall_rating, total_responses, teaching_effectiveness, content_mastery, student_engagement) values ($1,$2,$3,$4,$5,$6,$7) on conflict do nothing",
      [faculty_id, period, overall_rating, total_responses, teaching_effectiveness, content_mastery, student_engagement]
    );
  }

  // Upcoming events (5)
  const events = [
    ["CCS Sportsfest 2026", "CCS Student Council", "2026-11-29"],
    ["Faculty Development Seminar", "Office of the Dean", "2026-11-25"],
    ["Student Organization Fair", "CCS Student Organizations", "2026-12-05"],
    ["CCS Year-End Assembly", "Office of the Dean", "2026-12-15"],
    ["Alumni Homecoming Night", "ACCS-Alumni", "2026-12-20"],
  ];
  for (const [title, organizer, event_date] of events) {
    await q(
      "insert into events (title, organizer, event_date) values ($1,$2,$3) on conflict do nothing",
      [title, organizer, event_date]
    );
  }
}
