import { Router } from "express";
import { query } from "../db.js";
import { requireDean } from "../auth.js";

const router = Router();
router.use(requireDean);

const photoUrl = (r) => (r.has_photo ? `/api/photos/${encodeURIComponent(r.id_number)}?v=${r.photo_len}` : "");
const dateStr = (d) => (d ? (typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10)) : null);

// -------------------------------------------------------------
// GET /api/dean/dashboard
// -------------------------------------------------------------
router.get("/dashboard", async (req, res) => {
  try {
    // 1. Stats cards
    const [
      { rows: [studentCount] },
      { rows: [facultyCount] },
      { rows: [orgCount] },
      { rows: [researchCount] }
    ] = await Promise.all([
      query("select count(*)::int as count from accounts where role = 'Student'"),
      query("select count(*)::int as count from accounts where role = 'Faculty' and status = 'Activated'"),
      query("select count(*)::int as count from organizations where status = 'Active'"),
      query("select count(*)::int as count from research")
    ]);

    // 2. Students per program
    const { rows: progRows } = await query(
      "select coalesce(program, 'Other') as label, count(*)::int as value from accounts where role = 'Student' group by program order by value desc"
    );

    // 3. Students per year level
    const { rows: yearRows } = await query(
      "select coalesce(year_level, 0) as year, count(*)::int as value from accounts where role = 'Student' group by year_level order by year"
    );
    const yearLabels = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };
    const byYear = [1, 2, 3, 4].map((y) => ({
      label: yearLabels[y],
      value: yearRows.find((r) => Number(r.year) === y)?.value ?? 0
    }));

    // 4. Research status
    const { rows: resRows } = await query(
      "select status, count(*)::int as count from research group by status"
    );
    const researchStatus = {
      approved: resRows.find((r) => r.status === "Approved")?.count ?? 0,
      underReview: resRows.find((r) => r.status === "Under review")?.count ?? 0,
      needsRevision: resRows.find((r) => r.status === "Needs revision")?.count ?? 0
    };

    // 5. Upcoming events
    const { rows: upcomingEvents } = await query(
      "select id, title, organizer, event_date from events where event_date >= current_date - interval '14 days' order by event_date asc limit 5"
    );

    // 6. Latest announcements
    const { rows: latestAnnouncements } = await query(
      "select id, title, audience, publish_date, created_at from announcements where status = 'Published' order by coalesce(publish_date, created_at::date) desc, id desc limit 4"
    );

    // 7. Teaching assignments preview
    const { rows: teachingAssignments } = await query(`
      select a.full_name as faculty_name,
             count(distinct s.subject_code)::int as subject_count,
             coalesce(sum(3), 12)::int as total_units
      from accounts a
      left join schedules s on s.faculty_id = a.id
      where a.role = 'Faculty'
      group by a.id, a.full_name
      order by a.id
      limit 4
    `);

    res.json({
      stats: {
        totalStudents: studentCount?.count ?? 0,
        facultyMembers: facultyCount?.count ?? 0,
        activeOrgs: orgCount?.count ?? 0,
        researchCount: researchCount?.count ?? 0
      },
      byProgram: progRows,
      byYear,
      researchStatus,
      upcomingEvents: upcomingEvents.map((e) => ({
        ...e,
        event_date: dateStr(e.event_date)
      })),
      latestAnnouncements: latestAnnouncements.map((a) => ({
        ...a,
        date: dateStr(a.publish_date || a.created_at)
      })),
      teachingAssignments
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Failed to load dashboard data." });
  }
});

// -------------------------------------------------------------
// GET /api/dean/students
// -------------------------------------------------------------
router.get("/students", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const program = req.query.program;
    const year = req.query.year ? Number(req.query.year) : null;
    const section = req.query.section;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    const conds = ["role = 'Student'"];
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      conds.push(`(lower(full_name) like $${params.length} or lower(id_number) like $${params.length})`);
    }
    if (program && program !== "All programs" && program !== "All") {
      params.push(program);
      conds.push(`program = $${params.length}`);
    }
    if (year && !isNaN(year)) {
      params.push(year);
      conds.push(`year_level = $${params.length}`);
    }
    if (section && section !== "All sections" && section !== "All") {
      params.push(section);
      conds.push(`section = $${params.length}`);
    }

    const where = conds.length ? `where ${conds.join(" and ")}` : "";

    const { rows: [countRow] } = await query(`select count(*)::int as total from accounts ${where}`, params);
    const total = countRow?.total ?? 0;

    const queryParams = [...params, pageSize, offset];
    const { rows } = await query(
      `select id_number, full_name, email, status, program, year_level, section, acad_status,
              created_at, (photo is not null) as has_photo, length(photo) as photo_len
       from accounts ${where}
       order by id_number asc
       limit $${queryParams.length - 1} offset $${queryParams.length}`,
      queryParams
    );

    res.json({
      data: rows.map((r) => ({
        no: r.id_number,
        name: r.full_name,
        email: r.email,
        program: r.program,
        year_level: r.year_level,
        section: r.section,
        acad: r.acad_status || "Regular",
        status: r.status,
        photo: photoUrl(r),
        created: dateStr(r.created_at)
      })),
      total,
      page,
      pageSize
    });
  } catch (err) {
    console.error("Students list error:", err);
    res.status(500).json({ error: "Failed to load students." });
  }
});

// -------------------------------------------------------------
// GET /api/dean/faculty
// -------------------------------------------------------------
router.get("/faculty", async (req, res) => {
  try {
    const { rows } = await query(`
      select a.id, a.id_number, a.full_name, a.email, a.position, a.specialization, a.department,
             a.status, a.created_at, (a.photo is not null) as has_photo, length(a.photo) as photo_len,
             count(distinct s.id)::int as class_count,
             coalesce(sum(case when s.id is not null then 3 else 0 end), 12)::int as units
      from accounts a
      left join schedules s on s.faculty_id = a.id
      where a.role = 'Faculty'
      group by a.id, a.id_number, a.full_name, a.email, a.position, a.specialization, a.department, a.status, a.created_at, a.photo
      order by a.id_number asc
    `);

    res.json(
      rows.map((r) => ({
        id: r.id,
        no: r.id_number,
        name: r.full_name,
        email: r.email,
        position: r.position || "Instructor",
        specialization: r.specialization || "Information Technology",
        department: r.department || "IT Program",
        units: r.units || 12,
        available: r.status === "Activated",
        status: r.status,
        photo: photoUrl(r),
        created: dateStr(r.created_at)
      }))
    );
  } catch (err) {
    console.error("Faculty list error:", err);
    res.status(500).json({ error: "Failed to load faculty." });
  }
});

// -------------------------------------------------------------
// GET /api/dean/schedules
// -------------------------------------------------------------
router.get("/schedules", async (req, res) => {
  try {
    const { program, year, section } = req.query;
    const conds = ["1=1"];
    const params = [];

    if (program && program !== "All programs" && program !== "All") {
      params.push(program);
      conds.push(`s.program = $${params.length}`);
    }
    if (year && year !== "All years" && year !== "All") {
      params.push(Number(year));
      conds.push(`s.year_level = $${params.length}`);
    }
    if (section && section !== "All sections" && section !== "All") {
      params.push(section);
      conds.push(`s.section = $${params.length}`);
    }

    const { rows } = await query(
      `select s.*, a.full_name as faculty_name
       from schedules s
       left join accounts a on s.faculty_id = a.id
       where ${conds.join(" and ")}
       order by
         case s.day_of_week
           when 'Monday' then 1
           when 'Tuesday' then 2
           when 'Wednesday' then 3
           when 'Thursday' then 4
           when 'Friday' then 5
           when 'Saturday' then 6
           else 7
         end,
         s.time_start asc`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error("Schedules error:", err);
    res.status(500).json({ error: "Failed to load schedules." });
  }
});

// -------------------------------------------------------------
// GET /api/dean/consultations
// -------------------------------------------------------------
router.get("/consultations", async (req, res) => {
  try {
    const { rows } = await query(
      `select c.*, a.full_name as faculty_name
       from consultations c
       left join accounts a on c.faculty_id = a.id
       order by c.requested_at desc`
    );
    res.json(
      rows.map((r) => ({
        ...r,
        requested_at: dateStr(r.requested_at),
        scheduled_at: dateStr(r.scheduled_at)
      }))
    );
  } catch (err) {
    console.error("Consultations error:", err);
    res.status(500).json({ error: "Failed to load consultations." });
  }
});

// -------------------------------------------------------------
// GET /api/dean/evaluations
// -------------------------------------------------------------
router.get("/evaluations", async (req, res) => {
  try {
    const { rows } = await query(
      `select e.*, a.full_name as faculty_name, a.id_number as faculty_no, a.position
       from evaluations e
       join accounts a on e.faculty_id = a.id
       order by e.period desc, e.overall_rating desc`
    );
    res.json(rows);
  } catch (err) {
    console.error("Evaluations error:", err);
    res.status(500).json({ error: "Failed to load evaluations." });
  }
});

// -------------------------------------------------------------
// ANNOUNCEMENTS
// -------------------------------------------------------------
router.get("/announcements", async (req, res) => {
  try {
    const { rows } = await query(
      `select an.*, a.full_name as creator_name
       from announcements an
       left join accounts a on an.created_by = a.id
       order by coalesce(an.publish_date, an.created_at::date) desc, an.id desc`
    );
    res.json(
      rows.map((r) => ({
        ...r,
        publish_date: dateStr(r.publish_date),
        created_at: dateStr(r.created_at)
      }))
    );
  } catch (err) {
    console.error("Announcements error:", err);
    res.status(500).json({ error: "Failed to load announcements." });
  }
});

router.post("/announcements", async (req, res) => {
  try {
    const { title, body, audience, status, publish_date } = req.body ?? {};
    if (!title || !title.trim()) return res.status(400).json({ error: "Title is required." });

    const validAudience = ["All CCS", "Students", "Faculty", "Organizations"].includes(audience)
      ? audience
      : "All CCS";
    const validStatus = ["Draft", "Published", "Scheduled"].includes(status) ? status : "Draft";

    const { rows } = await query(
      `insert into announcements (title, body, audience, status, publish_date, created_by)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [title.trim(), body || "", validAudience, validStatus, publish_date || null, req.account.id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Create announcement error:", err);
    res.status(500).json({ error: "Failed to create announcement." });
  }
});

router.patch("/announcements/:id", async (req, res) => {
  try {
    const { title, body, audience, status, publish_date } = req.body ?? {};
    const { rows: existing } = await query("select * from announcements where id = $1", [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: "Announcement not found." });

    const prev = existing[0];
    const { rows } = await query(
      `update announcements
       set title = coalesce($1, title),
           body = coalesce($2, body),
           audience = coalesce($3, audience),
           status = coalesce($4, status),
           publish_date = $5
       where id = $6
       returning *`,
      [
        title !== undefined ? title.trim() : prev.title,
        body !== undefined ? body : prev.body,
        audience !== undefined ? audience : prev.audience,
        status !== undefined ? status : prev.status,
        publish_date !== undefined ? publish_date : prev.publish_date,
        req.params.id
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("Update announcement error:", err);
    res.status(500).json({ error: "Failed to update announcement." });
  }
});

// -------------------------------------------------------------
// APPROVALS
// -------------------------------------------------------------
router.get("/approvals", async (req, res) => {
  try {
    const { status } = req.query;
    const conds = [];
    const params = [];
    if (status && status !== "All") {
      params.push(status);
      conds.push(`status = $${params.length}`);
    }
    const where = conds.length ? `where ${conds.join(" and ")}` : "";
    const { rows } = await query(`select * from approvals ${where} order by submitted_at desc`, params);
    res.json(
      rows.map((r) => ({
        ...r,
        submitted_at: dateStr(r.submitted_at),
        decided_at: dateStr(r.decided_at)
      }))
    );
  } catch (err) {
    console.error("Approvals error:", err);
    res.status(500).json({ error: "Failed to load approvals." });
  }
});

router.patch("/approvals/:id", async (req, res) => {
  try {
    const { action, notes } = req.body ?? {};
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "Action must be 'approve' or 'reject'." });
    }
    const nextStatus = action === "approve" ? "Approved" : "Rejected";
    const { rows } = await query(
      `update approvals
       set status = $1, decided_by = $2, decided_at = now(), notes = coalesce($3, notes)
       where id = $4
       returning *`,
      [nextStatus, req.account.id, notes || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Approval request not found." });
    res.json(rows[0]);
  } catch (err) {
    console.error("Decide approval error:", err);
    res.status(500).json({ error: "Failed to update approval." });
  }
});

// -------------------------------------------------------------
// ORGANIZATIONS
// -------------------------------------------------------------
router.get("/organizations", async (req, res) => {
  try {
    const { rows } = await query(
      `select o.*, a.full_name as faculty_adviser_name
       from organizations o
       left join accounts a on o.faculty_adviser_id = a.id
       order by o.name asc`
    );
    res.json(rows);
  } catch (err) {
    console.error("Organizations error:", err);
    res.status(500).json({ error: "Failed to load organizations." });
  }
});

// -------------------------------------------------------------
// RESEARCH & CAPSTONE
// -------------------------------------------------------------
router.get("/research", async (req, res) => {
  try {
    const { rows } = await query(
      `select r.*, a.full_name as adviser_name
       from research r
       left join accounts a on r.adviser_id = a.id
       order by r.submitted_at desc`
    );
    res.json(
      rows.map((r) => ({
        ...r,
        submitted_at: dateStr(r.submitted_at)
      }))
    );
  } catch (err) {
    console.error("Research error:", err);
    res.status(500).json({ error: "Failed to load research." });
  }
});

router.patch("/research/:id", async (req, res) => {
  try {
    const { status } = req.body ?? {};
    if (!["Approved", "Under review", "Needs revision"].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }
    const { rows } = await query(
      "update research set status = $1 where id = $2 returning *",
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Research project not found." });
    res.json(rows[0]);
  } catch (err) {
    console.error("Research update error:", err);
    res.status(500).json({ error: "Failed to update research." });
  }
});

// -------------------------------------------------------------
// REPORTS
// -------------------------------------------------------------
router.get("/reports", async (req, res) => {
  try {
    const [
      { rows: enrollProg },
      { rows: enrollYear },
      { rows: facLoad },
      { rows: resSummary },
      { rows: orgSummary },
      { rows: evalSummary }
    ] = await Promise.all([
      query("select coalesce(program, 'Unknown') as program, count(*)::int as count from accounts where role = 'Student' group by program order by count desc"),
      query("select coalesce(year_level, 0) as year, count(*)::int as count from accounts where role = 'Student' group by year_level order by year"),
      query(`
        select a.full_name, a.position, a.department, count(distinct s.id)::int as classes, coalesce(sum(3), 12)::int as units
        from accounts a
        left join schedules s on s.faculty_id = a.id
        where a.role = 'Faculty'
        group by a.id, a.full_name, a.position, a.department
        order by a.full_name
      `),
      query("select status, category, count(*)::int as count from research group by status, category"),
      query("select name, officers_count, events_count, attendance_pct, status from organizations order by name"),
      query(`
        select a.full_name as faculty_name, e.period, e.overall_rating, e.total_responses
        from evaluations e
        join accounts a on e.faculty_id = a.id
        order by e.overall_rating desc
      `)
    ]);

    res.json({
      enrollmentByProgram: enrollProg,
      enrollmentByYear: enrollYear,
      facultyLoad: facLoad,
      researchSummary: resSummary,
      organizationSummary: orgSummary,
      evaluationSummary: evalSummary
    });
  } catch (err) {
    console.error("Reports error:", err);
    res.status(500).json({ error: "Failed to load reports." });
  }
});

// -------------------------------------------------------------
// ACCESS / AUTHORIZED USERS
// -------------------------------------------------------------
router.get("/access", async (req, res) => {
  try {
    const { rows } = await query(
      `select id, id_number, full_name, email, role, status, department, created_at,
              (photo is not null) as has_photo, length(photo) as photo_len
       from accounts
       where role in ('Registrar', 'Dean')
       order by role desc, id asc`
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        no: r.id_number,
        name: r.full_name,
        email: r.email,
        role: r.role,
        status: r.status,
        department: r.department,
        photo: photoUrl(r),
        created: dateStr(r.created_at)
      }))
    );
  } catch (err) {
    console.error("Access list error:", err);
    res.status(500).json({ error: "Failed to load access users." });
  }
});

export default router;
