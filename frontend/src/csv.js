// Building and downloading CSV files in the browser.

// Spreadsheet apps run a cell as a formula if it starts with = + - @ (or a tab / carriage return).
// Names come from imports, so neutralise those with a leading apostrophe before exporting.
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value) {
  let s = value == null ? "" : String(value);
  if (FORMULA_START.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** columns: [{ header, value: (row) => any }] */
export function toCsv(rows, columns) {
  const lines = [columns.map((c) => cell(c.header)).join(",")];
  for (const row of rows) lines.push(columns.map((c) => cell(c.value(row))).join(","));
  return lines.join("\r\n") + "\r\n";
}

export function downloadCsv(filename, text) {
  // the byte order mark makes Excel read the file as UTF-8 (names with ñ, é, ...)
  const url = URL.createObjectURL(new Blob(["﻿", text], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
