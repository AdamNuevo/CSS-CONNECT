import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { query } from "./db.js";

export const COOKIE = "ccs_token";
const SECRET = process.env.JWT_SECRET;

// New and reset accounts have no stored hash. They sign in with this default password and must
// change it. Not hashing at creation keeps a 2,000-row import fast.
export const defaultPassword = (idNumber) => `Ccs@${idNumber}`;

const digest = (s) => crypto.createHash("sha256").update(s).digest();
const sameString = (a, b) => crypto.timingSafeEqual(digest(a), digest(b));

/**
 * Which password matched: "password" (their own), "default" (Ccs@ID on a new or reset account),
 * "temp" (from Forgot password, valid 24 hours) or null. Signing in with "default" or "temp"
 * means they must set a new password before using the portal.
 */
export async function passwordMatch(account, password) {
  if (!password) return null;
  if (account.password_hash) {
    if (await bcrypt.compare(password, account.password_hash)) return "password";
  } else if (sameString(password, defaultPassword(account.id_number))) {
    return "default";
  }
  if (account.temp_password_hash && account.temp_expires_at && new Date(account.temp_expires_at) > new Date()
      && (await bcrypt.compare(password, account.temp_password_hash))) return "temp";
  return null;
}

export const checkPassword = async (account, password) => Boolean(await passwordMatch(account, password));

export const hashPassword = (password) => bcrypt.hash(password, 10);

// Rules shown on the Set password screen; the server checks them too.
export function passwordProblem(password) {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 128) return "That password is too long.";
  if (!/[A-Z]/.test(password)) return "Add at least one uppercase letter.";
  if (!/[0-9]/.test(password)) return "Add at least one number.";
  return "";
}

// A readable random temporary password, e.g. "KQ7M-4T9X" (no 0/O or 1/I to avoid mix-ups).
export function makeTempPassword() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const all = letters + "23456789";
  const pick = (set) => set[crypto.randomInt(set.length)];
  const chars = [pick(letters), pick("23456789"), ...Array.from({ length: 6 }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.slice(0, 4).join("") + "-" + chars.slice(4).join("");
}

const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;

// remember: "Keep me signed in" (30 days, otherwise until the browser closes / 8 hours).
// mustChange: signed in with a temporary or default password, so only Set password is allowed.
export function setSessionCookie(res, account, { remember = false, mustChange = false } = {}) {
  const token = jwt.sign({ sub: account.id, mc: mustChange || undefined, rm: remember || undefined }, SECRET, { expiresIn: remember ? "30d" : "8h" });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    ...(remember ? { maxAge: REMEMBER_MS } : {})
  });
}

const MUST_CHANGE = { error: "Set a new password first.", mustChangePassword: true };

export const clearSessionCookie = (res) => res.clearCookie(COOKIE);

// Looks the account up on every request so deactivating someone takes effect immediately.
export async function requireRegistrar(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: "Please sign in." });
  let payload;
  try { payload = jwt.verify(token, SECRET); } catch { return res.status(401).json({ error: "Your session has expired. Please sign in again." }); }
  const { rows } = await query("select id, id_number, full_name, email, role, status, (photo is not null) as has_photo, length(photo) as photo_len from accounts where id = $1", [payload.sub]);
  const account = rows[0];
  if (!account || account.status === "Deactivated") return res.status(401).json({ error: "Please sign in." });
  if (account.role !== "Registrar") return res.status(403).json({ error: "This portal is for registrar staff." });
  if (payload.mc) return res.status(403).json(MUST_CHANGE);
  req.account = account;
  next();
}

export const publicUser = (a, mustChange = false) => ({
  name: a.full_name,
  email: a.email,
  role: a.role,
  photo: a.has_photo ? `/api/photos/${encodeURIComponent(a.id_number)}?v=${a.photo_len}` : "",
  mustChangePassword: mustChange
});

// Generic: any authenticated, active, non-student account
export async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: "Please sign in." });
  let payload;
  try { payload = jwt.verify(token, SECRET); } catch { return res.status(401).json({ error: "Your session has expired. Please sign in again." }); }
  const { rows } = await query("select id, id_number, full_name, email, role, status, (photo is not null) as has_photo, length(photo) as photo_len from accounts where id = $1", [payload.sub]);
  const account = rows[0];
  if (!account || account.status === "Deactivated") return res.status(401).json({ error: "Please sign in." });
  if (account.role === "Student") return res.status(403).json({ error: "Access denied." });
  req.account = account;
  req.mustChange = Boolean(payload.mc);
  req.remember = Boolean(payload.rm);
  next();
}

export async function requireDean(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: "Please sign in." });
  let payload;
  try { payload = jwt.verify(token, SECRET); } catch { return res.status(401).json({ error: "Your session has expired. Please sign in again." }); }
  const { rows } = await query("select id, id_number, full_name, email, role, status, (photo is not null) as has_photo, length(photo) as photo_len from accounts where id = $1", [payload.sub]);
  const account = rows[0];
  if (!account || account.status === "Deactivated") return res.status(401).json({ error: "Please sign in." });
  if (account.role !== "Dean") return res.status(403).json({ error: "This portal is for the dean." });
  if (payload.mc) return res.status(403).json(MUST_CHANGE);
  req.account = account;
  next();
}
