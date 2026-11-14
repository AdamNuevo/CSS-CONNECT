// Demo people for presentations. Loaded only when SEED_DEMO=true and the database has no students yet.
// Names and emails are made up.

const PROGRAMS = ["BSIT", "BSIS", "BSCS"];
const DEPARTMENTS = ["IT Program", "IS Program", "CS Program"];
const day = (n) => `2026-11-${String(n).padStart(2, "0")}`;

const BASE_STUDENTS = [
  ["23-0012", "Juan Dela Cruz", "BSIT", 3, "A", "Regular", "Activated", day(1)],
  ["23-0098", "Maria Lopez", "BSCS", 2, "B", "Regular", "Reset requested", day(1)],
  ["23-0211", "Rico Navarro", "BSIT", 3, "A", "Irregular", "Activated", day(1)],
  ["23-0377", "Ella Bautista", "BSIS", 1, "A", "Regular", "Activated", day(3)],
  ["23-0150", "Marco Tan", "BSCS", 2, "B", "INC", "Not signed in", day(3)],
  ["23-0056", "Ana Reyes", "BSIS", 2, "A", "Regular", "Not signed in", day(1)],
  ["23-0029", "Paolo Cruz", "BSIT", 3, "A", "OW", "Deactivated", day(1)]
].map(([id, name, program, year, section, acad, status, created]) => ({ role: "Student", id, name, program, year, section, acad, status, created }));

const BASE_FACULTY = [
  ["FAC-2025-014", "Prof. Paolo Reyes", "IT Program", "Associate Professor", "Networking", "Activated", day(1)],
  ["FAC-2025-015", "Prof. Maria Santos", "IT Program", "Instructor", "Web Development", "Activated", day(1)],
  ["FAC-2025-016", "Engr. Carlo Mendoza", "IT Program", "Instructor", "Embedded Systems", "Not signed in", day(1)],
  ["FAC-2025-017", "Prof. Ana Villanueva", "CS Program", "Assistant Professor", "Artificial Intelligence", "Activated", day(1)],
  ["FAC-2025-018", "Prof. Lorna Dizon", "CS Program", "Professor", "Algorithms", "Activated", day(1)],
  ["FAC-2025-019", "Engr. Ramon Aquino", "IS Program", "Instructor", "Databases", "Not signed in", day(1)],
  ["FAC-2025-020", "Prof. Grace Tolentino", "IS Program", "Assistant Professor", "Systems Analysis", "Activated", day(2)]
].map(([id, name, dept, position, spec, status, created]) => ({ role: "Faculty", id, name, dept, position, spec, status, created }));

const FIRST = ["Andrea", "Bryan", "Camille", "Daniel", "Erika", "Francis", "Gabriel", "Hannah", "Isaac", "Jasmine", "Kevin", "Lara", "Miguel", "Nicole", "Oscar", "Patricia", "Quentin", "Rina", "Samuel", "Trisha", "Ulysses", "Vanessa", "Warren", "Yvonne"];
const LAST = ["Garcia", "Mendoza", "Ramos", "Castillo", "Flores", "Aquino", "Santiago", "Rivera", "Morales", "Domingo", "Salazar", "Villar"];
const YEAR_PREFIX = { 1: "25", 2: "24", 3: "23", 4: "22" };
// BSIT is the biggest program, BSCS the smallest
const PROGRAM_PATTERN = [0, 0, 1, 0, 2, 1, 0, 0, 2, 1, 0, 1, 0, 2];

const pickName = (i, step) => ({ first: FIRST[i % FIRST.length], last: LAST[(i * step + Math.floor(i / FIRST.length)) % LAST.length] });
const accountStatus = (i) => (i % 13 === 0 ? "Deactivated" : i % 9 === 0 ? "Not signed in" : i % 17 === 0 ? "Reset requested" : "Activated");
const acadStatus = (i) => (i % 29 === 0 ? "OW" : i % 23 === 0 ? "OD" : i % 19 === 0 ? "UD" : i % 11 === 0 ? "INC" : i % 6 === 0 ? "Irregular" : "Regular");

const GEN_STUDENTS = Array.from({ length: 41 }, (_, i) => {
  const { first, last } = pickName(i, 5);
  const year = (i % 4) + 1;
  return {
    role: "Student",
    id: `${YEAR_PREFIX[year]}-${String(1000 + i * 7).padStart(4, "0")}`,
    name: `${first} ${last}`,
    email: `${first}.${last}@qcu.edu.ph`.toLowerCase(),
    program: PROGRAMS[PROGRAM_PATTERN[i % PROGRAM_PATTERN.length]],
    year,
    section: i % 3 === 0 ? "B" : "A",
    acad: acadStatus(i + 1),
    status: accountStatus(i + 1),
    created: `2026-10-${String(10 + (i % 20)).padStart(2, "0")}`
  };
});

const POSITIONS = ["Instructor", "Assistant Professor", "Associate Professor", "Professor"];
const SPECS = {
  "IT Program": ["Networking", "Cloud Computing", "Cybersecurity", "Web Development"],
  "IS Program": ["Databases", "Systems Analysis", "Business Intelligence", "Project Management"],
  "CS Program": ["Machine Learning", "Algorithms", "Computer Graphics", "Data Structures"]
};
const GEN_FACULTY = Array.from({ length: 11 }, (_, i) => {
  const { first, last } = pickName(i + 3, 7);
  const dept = DEPARTMENTS[i % 3];
  return {
    role: "Faculty",
    id: `FAC-2025-${String(30 + i).padStart(3, "0")}`,
    name: `${i % 2 ? "Engr." : "Prof."} ${first} ${last}`,
    email: `${first}.${last}@qcu.edu.ph`.toLowerCase(),
    dept,
    position: POSITIONS[(i + 1) % 4],
    spec: SPECS[dept][i % 4],
    status: i % 5 === 0 ? "Not signed in" : "Activated",
    created: `2026-10-${String(12 + i).padStart(2, "0")}`
  };
});

// The hand-written people get an email from their name, e.g. "Juan Dela Cruz" -> juan.delacruz@qcu.edu.ph
const emailFromName = (name) => {
  const [first, ...rest] = name.replace(/^(Prof\.|Engr\.)\s*/, "").toLowerCase().split(/\s+/);
  return `${first}.${rest.join("")}@qcu.edu.ph`;
};
const withEmail = (p) => ({ ...p, email: p.email || emailFromName(p.name) });

// Emails must be unique, so a repeat of a name gets a number: gabriel.santiago2@qcu.edu.ph
export const demoPeople = () => {
  const taken = new Set();
  return [...BASE_STUDENTS, ...GEN_STUDENTS, ...BASE_FACULTY, ...GEN_FACULTY].map(withEmail).map((p) => {
    let email = p.email;
    for (let n = 2; taken.has(email); n++) email = p.email.replace("@", `${n}@`);
    taken.add(email);
    return { ...p, email };
  });
};
