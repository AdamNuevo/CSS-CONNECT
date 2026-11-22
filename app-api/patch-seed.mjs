// Makes a copy of the app's demo seed that uses the registrar's accounts instead of creating users.
// The original seed.ts is left untouched.
import fs from "node:fs";

const [src, dest] = process.argv.slice(2);
let s = fs.readFileSync(src, "utf8").split("\r\n").join("\n"); // Windows checkouts use CRLF

const from = s.indexOf("  // Users\n");
const to = s.indexOf("  // Courses");
if (from < 0 || to < 0) throw new Error("seed.ts has changed: cannot find the Users block");

const linked = `  // Users come from the registrar's accounts (copied into app.users by a database trigger).
  console.log('Linking users from the registrar accounts...');
  const byEmail = async (email: string) => {
    const [u] = await db.select().from(users).where(eq(users.email, email));
    if (!u) throw new Error('No account for ' + email + '. Add it in the registrar portal, or start with SEED_DEMO=true.');
    return u;
  };
  const [admin] = await db.select().from(users).where(eq(users.role, 'admin'));
  if (!admin) throw new Error('No dean account found to own the announcements.');
  const [faculty1, faculty2, faculty3] = await Promise.all(
    ['jose.reyes', 'ana.delacruz', 'ramon.garcia'].map((n) => byEmail(n + '@ccs.qcu.edu.ph'))
  );
  const insertedStudents = [];
  for (const n of ['kristine.villanueva', 'mark.ramos', 'jessa.aquino', 'carlo.mendoza', 'patricia.flores', 'angelo.cruz', 'sophia.lim', 'ryan.pascual']) {
    insertedStudents.push(await byEmail(n + '@students.qcu.edu.ph'));
  }

`;

s = s.slice(0, from) + linked + s.slice(to);
s = s.replace("  await db.delete(users);\n", "");
s = "import { eq } from 'drizzle-orm';\n" + s;
fs.writeFileSync(dest, s);
console.log("wrote", dest);
