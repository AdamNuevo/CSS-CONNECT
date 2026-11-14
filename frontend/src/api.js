// Thin wrapper around fetch for the backend. Login is an httpOnly cookie, so there is no token to manage here.

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

export async function api(path, { method = "GET", body, form } = {}) {
  const options = { method, credentials: "same-origin", headers: {} };
  if (form) {
    options.body = form; // multipart: the browser sets the content type
  } else if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch("/api" + path, options);
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }

  let data = null;
  try { data = await res.json(); } catch { /* empty or non-JSON body */ }

  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new Event("ccs:unauthorized"));
    throw new ApiError(data?.error || "Something went wrong. Please try again.", res.status, data?.fields);
  }
  return data;
}
