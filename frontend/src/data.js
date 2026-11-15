// Shared constants and small helpers. People and imports come from the API (see store.jsx).

export const PROGRAMS = ["BSIT", "BSIS", "BSCS"];
// Enrolled (Regular / Irregular), INC, UD, OD, OW — from Module 1 of the project spec
export const ACAD_STATUSES = ["Regular", "Irregular", "INC", "UD", "OD", "OW"];
export const DEPARTMENTS = ["IT Program", "IS Program", "CS Program"];
export const ACCOUNT_STATUSES = ["Activated", "Not signed in", "Reset requested", "Deactivated"];

// Badge colour for each status label
export const STATUS_CLASS = {
  // account status
  "Activated": "ok",
  "Not signed in": "warn",
  "Reset requested": "warn",
  "Deactivated": "idle",
  // academic status
  "Regular": "ok",
  "Irregular": "warn",
  "INC": "warn",
  "UD": "bad",
  "OD": "bad",
  "OW": "idle"
};

export const initials = (name) =>
  name
    .replace(/^(Prof\.|Engr\.|Dr\.|Ms\.|Mr\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const formatDate = (iso) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
};

// Activity log: label and badge colour for each kind of action
export const ACTIVITY_TYPES = {
  sign_in: { label: "Signed in", tone: "idle" },
  person_added: { label: "Person added", tone: "ok" },
  person_edited: { label: "Details edited", tone: "idle" },
  import: { label: "CSV import", tone: "ok" },
  password_reset: { label: "Password reset", tone: "warn" },
  deactivated: { label: "Deactivated", tone: "bad" },
  reactivated: { label: "Reactivated", tone: "ok" },
  password_changed: { label: "Password changed", tone: "idle" },
  profile_photo: { label: "Profile photo", tone: "idle" }
};

// "2026-11-14T07:42:00.000Z" -> "Nov 14, 2026, 3:42 PM" in the viewer's time zone
export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
