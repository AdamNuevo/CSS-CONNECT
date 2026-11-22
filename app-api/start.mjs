// Starts the app backend on the shared database:
//  1. wait until the main API has prepared the database (schema "app" and the sync trigger)
//  2. create the app's tables (in schema "app")
//  3. copy every Student/Faculty/Dean account into the app's user table
//  4. load the app's demo data once, if SEED_DEMO=true
//  5. run the server
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import pg from "pg";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is missing");
// same derivation as backend/src/routes/mobile.js
const secret = crypto.createHash("sha256").update(`${process.env.JWT_SECRET}:app-access`).digest("hex");
process.env.JWT_ACCESS_SECRET = secret;
process.env.JWT_REFRESH_SECRET = secret;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const demo = process.env.SEED_DEMO === "true";
const base = new URL(process.env.DATABASE_URL);
base.searchParams.delete("options"); // plain connection: we address schemas by name here
const admin = new pg.Client({ connectionString: base.toString() });

async function ready() {
  const { rows } = await admin.query("select to_regprocedure('public.sync_app_user()') as fn");
  if (!rows[0].fn) return false;
  if (!demo) return true;
  const r = await admin.query("select 1 from public.accounts where email = 'kristine.villanueva@students.qcu.edu.ph'");
  return r.rowCount > 0;
}

await admin.connect();
for (let i = 1; !(await ready().catch(() => false)); i++) {
  if (i > 90) throw new Error("The main API never prepared the database.");
  if (i % 5 === 1) console.log("[app-api] waiting for the main API to prepare the database...");
  await sleep(2000);
}

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", env: process.env });
  if (r.status !== 0) throw new Error(`${args.join(" ")} failed`);
};
run("npx", ["tsx", "src/db/migrate.ts"]);

// touching each account fires the trigger, which creates or refreshes its app user
const { rowCount } = await admin.query(
  "update public.accounts set id = id where role in ('Student', 'Faculty', 'Dean') and app_user_id is null");
console.log(`[app-api] linked ${rowCount} accounts to app users`);

if (demo) {
  const { rows } = await admin.query("select count(*)::int as n from app.courses");
  if (rows[0].n === 0) run("npx", ["tsx", "src/db/seed-linked.ts"]);
}
await admin.end();

const server = spawn("npx", ["tsx", "src/index.ts"], { stdio: "inherit", env: process.env });
server.on("exit", (code) => process.exit(code ?? 1));
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => server.kill(sig));
