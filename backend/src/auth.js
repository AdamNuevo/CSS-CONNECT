import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { query } from "./db.js";

export const COOKIE = "ccs_token";
const SECRET = process.env.JWT_SECRET;
const MAX_AGE_MS = 8 * 60 * 60 * 1000;

// New and reset accounts have no stored hash. They sign in with this default password and must
// change it. Not hashing at creation keeps a 2,000-row import fast.
export const defaultPassword = (idNumber) => `Ccs@${idNumber}`;

const digest = (s) => crypto.createHash("sha256").update(s).digest();
const sameString = (a, b) => crypto.timingSafeEqual(digest(a), digest(b));

export async function checkPassword(account, password) {
  if (account.password_hash) return bcrypt.compare(password, account.password_hash);
  return sameString(password, defaultPassword(account.id_number));
}

export const hashPassword = (password) => bcrypt.hash(password, 10);

export function setSessionCookie(res, account) {
  const token = jwt.sign({ sub: account.id }, SECRET, { expiresIn: "8h" });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    maxAge: MAX_AGE_MS
  });
}

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
  req.account = account;
  next();
}

export const publicUser = (a) => ({
  name: a.full_name,
  email: a.email,
  role: a.role,
  photo: a.has_photo ? `/api/photos/${encodeURIComponent(a.id_number)}?v=${a.photo_len}` : ""
});
