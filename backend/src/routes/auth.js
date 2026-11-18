import { Router } from "express";
import rateLimit from "express-rate-limit";
import { query } from "../db.js";
import {
  passwordMatch, hashPassword, passwordProblem, makeTempPassword,
  setSessionCookie, clearSessionCookie, requireAuth, publicUser
} from "../auth.js";
import { validPhoto } from "../validate.js";
import { logActivity } from "../activity.js";
import { sendLoginDetails } from "../mail.js";

const router = Router();

// slows down password guessing: 10 attempts per IP per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Try again in 15 minutes." }
});

// stops "Forgot password" from being used to flood someone's inbox
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again in 15 minutes." }
});

const ACCOUNT_COLUMNS = "id, id_number, full_name, email, role, status, password_hash, temp_password_hash, temp_expires_at, (photo is not null) as has_photo, length(photo) as photo_len";
const emailFrom = (body) => (typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "");

router.post("/login", loginLimiter, async (req, res) => {
  const email = emailFrom(req.body);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const remember = req.body?.remember === true;
  const { rows } = await query(`select ${ACCOUNT_COLUMNS} from accounts where lower(email) = $1`, [email]);
  const account = rows[0];

  // same message for "no such account" and "wrong password" so emails can't be probed
  const kind = account ? await passwordMatch(account, password) : null;
  if (!kind) return res.status(401).json({ error: "Incorrect email or password. Check your details and try again." });
  if (account.status === "Deactivated") return res.status(403).json({ error: "This account is deactivated. Contact the CCS registrar." });
  if (account.role !== "Registrar" && account.role !== "Dean")
    return res.status(403).json({ error: "This portal is for registrar staff and the dean." });

  const mustChange = kind !== "password"; // signed in with a temporary or default password
  setSessionCookie(res, account, { remember, mustChange });
  await logActivity({ id: account.id, full_name: account.full_name }, "sign_in");
  res.json({ user: publicUser(account, mustChange) });
});

// Emails a temporary password (valid 24 hours). Always answers the same way, so it can't be used
// to find out which emails have accounts. The person's current password keeps working.
router.post("/forgot-password", forgotLimiter, async (req, res) => {
  const email = emailFrom(req.body);
  if (!email) return res.status(400).json({ error: "Enter your email.", fields: { email: "Enter your email." } });
  res.json({ ok: true });

  // after answering, so the response time doesn't reveal whether the account exists
  try {
    const { rows } = await query("select id, id_number, full_name, email, status from accounts where lower(email) = $1", [email]);
    const account = rows[0];
    if (!account || account.status === "Deactivated") return;
    const temp = makeTempPassword();
    await query("update accounts set temp_password_hash = $1, temp_expires_at = now() + interval '24 hours' where id = $2", [await hashPassword(temp), account.id]);
    await logActivity({ id: account.id, full_name: account.full_name }, "forgot_password", { targetId: account.id_number, targetName: account.full_name });
    await sendLoginDetails({ name: account.full_name, email: account.email, idNumber: account.id_number, password: temp }, "temp");
  } catch (err) {
    console.error("Forgot password failed:", err.message);
  }
});

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.account, req.mustChange) }));

router.patch("/me", requireAuth, async (req, res) => {
  if (req.mustChange) return res.status(403).json({ error: "Set a new password first.", mustChangePassword: true });
  const { photo } = req.body ?? {};
  if (photo !== "" && !validPhoto(photo)) return res.status(400).json({ error: "Use a PNG, JPG, WebP or GIF image up to 2 MB." });
  await query("update accounts set photo = $1 where id = $2", [photo || null, req.account.id]);
  await logActivity(req.account, "profile_photo", { detail: photo ? "Updated" : "Removed" });
  const { rows } = await query(`select ${ACCOUNT_COLUMNS} from accounts where id = $1`, [req.account.id]);
  res.json({ user: publicUser(rows[0]) });
});

// Used by Set password (after a temporary/default password) and by Change password on the profile.
router.post("/change-password", requireAuth, async (req, res) => {
  const current = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
  const next = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
  const reject = (field, message) => res.status(400).json({ error: message, fields: { [field]: message } });
  const problem = passwordProblem(next);
  if (problem) return reject("newPassword", problem);

  const { rows } = await query(`select ${ACCOUNT_COLUMNS} from accounts where id = $1`, [req.account.id]);
  if (!(await passwordMatch(rows[0], current))) return reject("currentPassword", req.mustChange ? "The temporary password is wrong." : "Current password is wrong.");
  if (current === next) return reject("newPassword", "Choose a password different from your current one.");

  await query(
    "update accounts set password_hash = $1, status = 'Activated', temp_password_hash = null, temp_expires_at = null where id = $2",
    [await hashPassword(next), req.account.id]
  );
  await logActivity(req.account, "password_changed");
  setSessionCookie(res, rows[0], { remember: req.remember }); // a fresh session without the "must change" mark
  res.json({ ok: true, user: publicUser(rows[0]) });
});

export default router;
