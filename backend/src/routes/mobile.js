import { Router } from "express";
import rateLimit from "express-rate-limit";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { query } from "../db.js";
import { passwordMatch, hashPassword, passwordProblem, makeTempPassword } from "../auth.js";
import { logActivity } from "../activity.js";
import { sendLoginDetails } from "../mail.js";

// Routes for the student / faculty phone app, mounted at /api/v1.
// They use the same `accounts` table and the same passwords as the web system.
// The phone app has no browser cookies, so it signs in with Bearer tokens instead:
//   access token  = 15 minutes, sent as "Authorization: Bearer ..."
//   refresh token = 7 days (30 with "keep me signed in"), only used to get a new access token
const router = Router();
const SECRET = process.env.JWT_SECRET;
// The app's own backend (a second container on the same database) checks access tokens with this
// secret. It is derived from JWT_SECRET so there is nothing extra to configure; the app container
// computes the same value on start. Sessions that must still set a password get a token signed with
// SECRET instead, which the app backend rejects, so they can only reach "set password".
export const APP_ACCESS_SECRET = crypto.createHash("sha256").update(`${SECRET}:app-access`).digest("hex");
const APP_ROLES = ["Student", "Faculty"];

// Only needed when the app runs in a browser (Expo web); native phones don't send an Origin.
const ORIGINS = (process.env.CORS_ORIGINS ?? "http://localhost:8081,http://localhost:19006").split(",").map((o) => o.trim()).filter(Boolean);
router.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin && ORIGINS.includes(origin)) {
    res.set({ "Access-Control-Allow-Origin": origin, Vary: "Origin", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS" });
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } });

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many attempts. Try again in 15 minutes." } }
});

const COLUMNS = `id, app_user_id, id_number, full_name, email, role, status, password_hash, temp_password_hash, temp_expires_at,
  program, year_level, section, created_at`;

const emailFrom = (body) => (typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "");
const text = (v) => (typeof v === "string" ? v : "");

const YEARS = { 1: "1st Year", 2: "2nd Year", 3: "3rd Year", 4: "4th Year" }; // the wording the app uses

// "Dr. Elena Marquez" -> first "Elena", last "Marquez"
function splitName(full) {
  const words = full.replace(/^(dr|mr|ms|mrs|engr|prof|atty)\.?\s+/i, "").trim().split(/\s+/);
  if (words.length === 1) return { firstName: words[0], lastName: "" };
  return { firstName: words.slice(0, -1).join(" "), lastName: words[words.length - 1] };
}

// The shape the phone app expects (see packages/shared in the app repo)
function appUser(a) {
  const { firstName, lastName } = splitName(a.full_name);
  return {
    id: a.app_user_id,
    email: a.email,
    role: a.role.toLowerCase(),
    firstName,
    lastName,
    middleName: null,
    studentNumber: a.role === "Student" ? a.id_number : null,
    employeeNumber: a.role === "Faculty" ? a.id_number : null,
    program: a.program ?? null,
    yearLevel: YEARS[a.year_level] ?? null,
    section: a.section ?? null,
    avatarUrl: null,
    isActive: a.status !== "Deactivated",
    createdAt: new Date(a.created_at).toISOString()
  };
}

function issueTokens(account, { remember = false, mustChange = false } = {}) {
  const base = { sub: account.id, mc: mustChange || undefined, rm: remember || undefined };
  const accessToken = mustChange || !account.app_user_id
    ? jwt.sign({ ...base, typ: "access" }, SECRET, { expiresIn: "15m" })
    : jwt.sign(
        { sub: account.app_user_id, id: account.app_user_id, email: account.email, role: account.role.toLowerCase() },
        APP_ACCESS_SECRET, { expiresIn: "15m" }
      );
  return {
    accessToken,
    refreshToken: jwt.sign({ ...base, typ: "refresh" }, SECRET, { expiresIn: remember ? "30d" : "7d" }),
    expiresIn: 15 * 60
  };
}

async function loadAccount(id) {
  const { rows } = await query(`select ${COLUMNS} from accounts where id = $1`, [id]);
  return rows[0];
}

// Looks the account up on every request, so deactivating someone takes effect immediately.
async function requireBearer(req, res, next) {
  const header = req.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return fail(res, 401, "UNAUTHORIZED", "Please sign in.");
  let account = null;
  let mustChange = false;
  let remember = false;
  try {
    // a normal session: the token the app backend also accepts (subject = app user id)
    const p = jwt.verify(token, APP_ACCESS_SECRET);
    const { rows } = await query(`select ${COLUMNS} from accounts where app_user_id = $1`, [p.sub]);
    account = rows[0];
  } catch {
    try {
      // a session that still has to set its password (subject = account id)
      const p = jwt.verify(token, SECRET);
      if (p.typ !== "access") throw new Error("not an access token");
      account = await loadAccount(p.sub);
      mustChange = Boolean(p.mc);
      remember = Boolean(p.rm);
    } catch {
      return fail(res, 401, "UNAUTHORIZED", "Invalid access token");
    }
  }
  if (!account || account.status === "Deactivated") return fail(res, 401, "UNAUTHORIZED", "Please sign in.");
  if (!APP_ROLES.includes(account.role)) return fail(res, 403, "FORBIDDEN", "This app is for students and faculty.");
  req.account = account;
  req.mustChange = mustChange;
  req.remember = remember;
  next();
}

// Until the person sets their own password, only "set password" and "who am I" are allowed.
export function requireSetPassword(req, res, next) {
  if (req.mustChange) return fail(res, 403, "PASSWORD_CHANGE_REQUIRED", "Set a new password first.");
  next();
}

router.post("/auth/login", authLimiter, async (req, res) => {
  const email = emailFrom(req.body);
  const password = text(req.body?.password);
  const keepSignedIn = req.body?.keepSignedIn === true;
  const { rows } = await query(`select ${COLUMNS} from accounts where lower(email) = $1`, [email]);
  const account = rows[0];

  // same message for "no such account" and "wrong password" so emails can't be probed
  const kind = account ? await passwordMatch(account, password) : null;
  if (!kind) return fail(res, 401, "INVALID_CREDENTIALS", "Incorrect email or password. Check your details and try again.");
  if (account.status === "Deactivated") return fail(res, 403, "ACCOUNT_DEACTIVATED", "This account is deactivated. Contact the CCS registrar.");
  if (!APP_ROLES.includes(account.role)) return fail(res, 403, "FORBIDDEN", "This app is for students and faculty.");

  const mustChange = kind !== "password"; // default or temporary password
  await logActivity({ id: account.id, full_name: account.full_name }, "sign_in", { detail: "Mobile app" });
  res.json({
    user: appUser(account),
    tokens: issueTokens(account, { remember: keepSignedIn, mustChange }),
    mustChangePassword: mustChange
  });
});

router.post("/auth/refresh", authLimiter, async (req, res) => {
  let payload;
  try { payload = jwt.verify(text(req.body?.refreshToken), SECRET); } catch { return fail(res, 401, "UNAUTHORIZED", "Invalid refresh token"); }
  if (payload.typ !== "refresh") return fail(res, 401, "UNAUTHORIZED", "Invalid refresh token");
  const account = await loadAccount(payload.sub);
  if (!account || account.status === "Deactivated" || !APP_ROLES.includes(account.role)) return fail(res, 401, "UNAUTHORIZED", "Please sign in.");
  res.json({ tokens: issueTokens(account, { remember: Boolean(payload.rm), mustChange: Boolean(payload.mc) }) });
});

// Tokens are stateless, so there is nothing to revoke on the server. The app deletes its copy.
router.post("/auth/logout", (req, res) => res.json({ ok: true }));

// Emails a temporary password (valid 24 hours). Always answers the same way.
const forgot = async (req, res) => {
  const email = emailFrom(req.body);
  if (!email) return fail(res, 400, "VALIDATION_ERROR", "Enter your email.");
  res.json({ message: "If that email is registered, a temporary password has been sent." });
  try {
    const { rows } = await query("select id, id_number, full_name, email, role, status from accounts where lower(email) = $1", [email]);
    const account = rows[0];
    if (!account || account.status === "Deactivated" || !APP_ROLES.includes(account.role)) return;
    const temp = makeTempPassword();
    await query("update accounts set temp_password_hash = $1, temp_expires_at = now() + interval '24 hours' where id = $2", [await hashPassword(temp), account.id]);
    await logActivity({ id: account.id, full_name: account.full_name }, "forgot_password", { targetId: account.id_number, targetName: account.full_name });
    await sendLoginDetails({ name: account.full_name, email: account.email, idNumber: account.id_number, password: temp }, "temp");
  } catch (err) {
    console.error("Forgot password (app) failed:", err.message);
  }
};
router.post("/auth/forgot-password", authLimiter, forgot);
router.post("/auth/first-time", authLimiter, forgot);

router.get("/auth/me", requireBearer, (req, res) => res.json({ user: appUser(req.account) }));

// Used for the forced "Set password" step and for Change password later.
router.post("/auth/change-password", requireBearer, async (req, res) => {
  const current = text(req.body?.currentPassword);
  const next = text(req.body?.newPassword);
  const confirm = text(req.body?.confirmPassword);
  if (next !== confirm) return fail(res, 400, "VALIDATION_ERROR", "Passwords do not match");
  const problem = passwordProblem(next);
  if (problem) return fail(res, 400, "VALIDATION_ERROR", problem);

  const account = await loadAccount(req.account.id);
  if (!(await passwordMatch(account, current))) {
    return fail(res, 400, "INVALID_CREDENTIALS", req.mustChange ? "The temporary password is wrong." : "Current password is wrong.");
  }
  if (current === next) return fail(res, 400, "VALIDATION_ERROR", "Choose a password different from your current one.");

  await query(
    "update accounts set password_hash = $1, status = 'Activated', temp_password_hash = null, temp_expires_at = null where id = $2",
    [await hashPassword(next), account.id]
  );
  await logActivity(account, "password_changed", { detail: "Mobile app" });
  const fresh = await loadAccount(account.id);
  res.json({ user: appUser(fresh), tokens: issueTokens(fresh, { remember: req.remember }) });
});

export { requireBearer };
export default router;
