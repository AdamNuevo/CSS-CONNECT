import { Router } from "express";
import rateLimit from "express-rate-limit";
import { query } from "../db.js";
import {
  checkPassword, hashPassword, setSessionCookie, clearSessionCookie, requireRegistrar, requireAuth, publicUser
} from "../auth.js";
import { validPhoto } from "../validate.js";
import { logActivity } from "../activity.js";

const router = Router();

// slows down password guessing: 10 attempts per IP per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Try again in 15 minutes." }
});

const ACCOUNT_COLUMNS = "id, id_number, full_name, email, role, status, password_hash, (photo is not null) as has_photo, length(photo) as photo_len";

router.post("/login", loginLimiter, async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const { rows } = await query(`select ${ACCOUNT_COLUMNS} from accounts where lower(email) = $1`, [email]);
  const account = rows[0];

  // same message for "no such account" and "wrong password" so emails can't be probed
  const bad = () => res.status(401).json({ error: "Wrong email or password." });
  if (!account || !password || !(await checkPassword(account, password))) return bad();
  if (account.status === "Deactivated") return res.status(403).json({ error: "This account is deactivated." });
  if (account.role !== "Registrar" && account.role !== "Dean") 
    return res.status(403).json({ error: "This portal is for registrar staff and the dean." });

  setSessionCookie(res, account);
  await logActivity({ id: account.id, full_name: account.full_name }, "sign_in");
  res.json({ user: publicUser(account) });
});

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.account) }));

router.patch("/me", requireAuth, async (req, res) => {
  const { photo } = req.body ?? {};
  if (photo !== "" && !validPhoto(photo)) return res.status(400).json({ error: "Use a PNG, JPG, WebP or GIF image up to 2 MB." });
  await query("update accounts set photo = $1 where id = $2", [photo || null, req.account.id]);
  await logActivity(req.account, "profile_photo", { detail: photo ? "Updated" : "Removed" });
  const { rows } = await query(`select ${ACCOUNT_COLUMNS} from accounts where id = $1`, [req.account.id]);
  res.json({ user: publicUser(rows[0]) });
});

router.post("/change-password", requireAuth, async (req, res) => {
  const current = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
  const next = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
  const reject = (field, message) => res.status(400).json({ error: message, fields: { [field]: message } });
  if (next.length < 8) return reject("newPassword", "Use at least 8 characters.");
  if (next.length > 128) return reject("newPassword", "That password is too long.");

  const { rows } = await query(`select ${ACCOUNT_COLUMNS} from accounts where id = $1`, [req.account.id]);
  if (!(await checkPassword(rows[0], current))) return reject("currentPassword", "Current password is wrong.");

  await query("update accounts set password_hash = $1, status = 'Activated' where id = $2", [await hashPassword(next), req.account.id]);
  await logActivity(req.account, "password_changed");
  res.json({ ok: true });
});

export default router;
