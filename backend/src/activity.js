import { query } from "./db.js";

// Every action the registrar can take that changes something. The activity log is append-only:
// nothing in the API edits or deletes its rows.
export const ACTIVITY_ACTIONS = [
  "sign_in", "person_added", "person_edited", "import",
  "password_reset", "deactivated", "reactivated", "password_changed", "profile_photo"
];

const clean = (v, max) => (typeof v === "string" && v.trim() ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : null);

/**
 * Records who did what. `actor` is the signed-in account row ({ id, full_name }).
 * With the default `db` a failure is logged but never breaks the action that just succeeded.
 * Pass a transaction client as `db` to make the entry part of that transaction instead.
 */
export async function logActivity(actor, action, { targetId, targetName, detail } = {}, db) {
  const run = db ?? { query };
  const sql = "insert into activity (actor_id, actor_name, action, target_id, target_name, detail) values ($1, $2, $3, $4, $5, $6)";
  const params = [actor.id, actor.full_name, action, clean(targetId, 64), clean(targetName, 120), clean(detail, 500)];
  if (db) return run.query(sql, params);
  try { await run.query(sql, params); } catch (err) { console.error("Could not write activity log:", err.message); }
}
