import { Router } from "express";
import { query } from "../db.js";
import { ACTIVITY_ACTIONS } from "../activity.js";

const router = Router();
const PAGE_SIZE = 15;

// GET /api/activity?action=&q=&page=   newest first
router.get("/activity", async (req, res) => {
  const action = typeof req.query.action === "string" && ACTIVITY_ACTIONS.includes(req.query.action) ? req.query.action : null;
  const text = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  // escape LIKE wildcards so "100%" or "_" search for those characters
  const like = text ? `%${text.replace(/[\\%_]/g, "\\$&")}%` : null;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

  const where = `where ($1::text is null or action = $1)
    and ($2::text is null or actor_name ilike $2 or target_id ilike $2 or target_name ilike $2 or detail ilike $2)`;
  const { rows: count } = await query(`select count(*)::int as n from activity ${where}`, [action, like]);
  const total = count[0].n;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pages);

  const { rows } = await query(
    `select id, at, actor_name, action, target_id, target_name, detail from activity ${where}
     order by at desc, id desc limit ${PAGE_SIZE} offset $3`,
    [action, like, (current - 1) * PAGE_SIZE]
  );
  res.json({
    items: rows.map((r) => ({
      id: r.id, at: r.at.toISOString(), actor: r.actor_name, action: r.action,
      targetId: r.target_id || "", targetName: r.target_name || "", detail: r.detail || ""
    })),
    total, page: current, pages, pageSize: PAGE_SIZE
  });
});

export default router;
