import nodemailer from "nodemailer";
import { fileURLToPath } from "node:url";
import { defaultPassword } from "./auth.js";

const LOGO = fileURLToPath(new URL("./assets/qcu-logo.png", import.meta.url));

// Sends login details through an SMTP service (we use Brevo: smtp-relay.brevo.com).
// Turned on only when MAIL_HOST, MAIL_USER, MAIL_PASSWORD and MAIL_FROM are set in .env;
// otherwise every send is skipped and the registrar hands out the default password in person.
const host = process.env.MAIL_HOST?.trim();
const port = Number(process.env.MAIL_PORT) || 587;
const user = process.env.MAIL_USER?.trim();
const pass = process.env.MAIL_PASSWORD?.trim();
const from = process.env.MAIL_FROM?.trim(); // the sender address shown to students (must be verified in Brevo)
const appUrl = (process.env.APP_URL || "http://localhost:8080").replace(/\/+$/, "");
const fromName = process.env.MAIL_FROM_NAME || "CCS Hub";

export const mailEnabled = Boolean(host && user && pass && from);

const transport = mailEnabled
  ? nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 587 upgrades to TLS with STARTTLS
      requireTLS: port !== 465,
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000
    })
  : null;

if (mailEnabled) console.log(`Email is on: sending as ${from} through ${host}`);
else console.log("Email is off: set MAIL_HOST, MAIL_USER, MAIL_PASSWORD and MAIL_FROM in .env to turn it on");

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// kind: "welcome" (new account) | "reset" (registrar reset it) | "temp" (Forgot password; person.password is the temp one)
export function message({ name, email, idNumber, password: given }, kind) {
  const password = given || defaultPassword(idNumber);
  const COPY = {
    welcome: ["Your CCS Hub account is ready", "The registrar created your CCS Hub account. Sign in with the details below."],
    reset: ["Your CCS Hub password was reset", "The registrar reset your CCS Hub password. Sign in with the temporary password below."],
    temp: ["Your CCS Hub temporary password", "We got a request to reset your password. Sign in with this temporary password. It expires in 24 hours."]
  };
  const [subject, intro] = COPY[kind] || COPY.welcome;
  const ignore = kind === "temp"
    ? "If you didn't ask for this, you can ignore this email. Your current password still works."
    : "If you weren't expecting this email, contact the CCS registrar.";
  const text = [
    `Hi ${name},`, "", intro, "",
    `Email: ${email}`, `Temporary password: ${password}`, `Sign in: ${appUrl}/login`, "",
    "You'll be asked to set your own password after you sign in.", "",
    ignore,
    "QCU College of Computer Studies"
  ].join("\n");
  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:auto;color:#1a1d24;border:1px solid #dfe3f0;border-radius:10px;overflow:hidden">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
      <tr>
        <td style="height:5px;background:#2d5fd3;width:33.34%"></td>
        <td style="height:5px;background:#c4243c;width:33.33%"></td>
        <td style="height:5px;background:#f0c63a;width:33.33%"></td>
      </tr>
      <tr><td colspan="3" style="background:#13235f;padding:20px 24px">
        <table role="presentation" cellspacing="0" cellpadding="0"><tr>
          <td style="padding-right:12px"><img src="cid:qcu-logo" width="48" height="48" alt="QCU" style="display:block"></td>
          <td style="color:#fff"><strong style="font-size:18px">CCS Hub</strong><br><span style="color:#c9d0f5;font-size:13px">Quezon City University</span></td>
        </tr></table>
      </td></tr>
    </table>
    <div style="padding:20px 24px">
    <h2 style="color:#1d3a8a;margin:0 0 12px;font-size:20px">${esc(subject)}</h2>
    <p>Hi ${esc(name)},</p>
    <p>${esc(intro)}</p>
    <table style="border-collapse:collapse;margin:12px 0">
      <tr><td style="padding:4px 12px 4px 0;color:#555">Email</td><td style="padding:4px 0"><strong>${esc(email)}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#555">Temporary password</td><td style="padding:4px 0"><code style="background:#eef2fb;padding:2px 6px;border-radius:4px;font-size:15px">${esc(password)}</code></td></tr>
    </table>
    <p><a href="${esc(appUrl)}/login" style="display:inline-block;background:#2540c8;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Sign in to CCS Hub</a></p>
    <p>You'll be asked to set your own password after you sign in.</p>
    <p style="color:#777;font-size:13px">${esc(ignore)}<br>QCU College of Computer Studies</p>
    </div>
  </div>`;
  return { subject, text, html };
}

/**
 * Emails a person their sign-in details. kind: "welcome" (new account) | "reset" (password reset).
 * Never throws: returns true when Gmail accepted the message, false when mail is off or sending failed.
 */
export async function sendLoginDetails(person, kind = "welcome") {
  if (!transport || !person?.email) return false;
  try {
    await transport.sendMail({
      from: { name: fromName, address: from },
      to: person.email,
      ...message(person, kind),
      attachments: [{ filename: "qcu-logo.png", path: LOGO, cid: "qcu-logo" }] // shown inside the email, not as a file
    });
    return true;
  } catch (err) {
    console.error(`Email to ${person.email} failed:`, err.message);
    return false;
  }
}

// Sends one by one in the background (mail services dislike bursts). Used after a CSV import.
export function sendLoginDetailsInBackground(people) {
  if (!transport || !people.length) return;
  (async () => {
    let sent = 0;
    for (const p of people) {
      if (await sendLoginDetails(p)) sent++;
      await new Promise((r) => setTimeout(r, 1000));
    }
    console.log(`Import emails: ${sent} of ${people.length} sent`);
  })();
}
