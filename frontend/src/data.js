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
