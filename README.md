<<<<<<< HEAD
# CSS-CONNECT
=======
# CCS Connect

A Centralized Data Governance and Academic Information Management System for the College of
Computer Studies, Quezon City University.

This repository currently contains the **registrar portal**: staff sign in, import or add student and
faculty accounts, reset passwords, and activate or deactivate accounts. The other modules from the
"Modules and Features" document are not built yet.

## Tech stack

| Part | Technology |
|---|---|
| Frontend | React 18, React Router, Vite |
| Backend | Node.js 22, Express 5 |
| Database | PostgreSQL 16 |
| Running it | Docker + Docker Compose (nginx serves the React build and forwards `/api` to the backend) |

```
Browser -> web (nginx + React) -> api (Express) -> db (PostgreSQL)
```

## Run it

You need [Docker Desktop](https://www.docker.com/products/docker-desktop/) running. Nothing else.

1. Copy `.env.example` to `.env` and fill it in:
   - `DB_PASSWORD`: any password, letters and numbers only
   - `JWT_SECRET`: at least 32 random characters. Generate one with
     `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
   - `SEED_REGISTRAR_PASSWORD`: the first registrar's password (8+ characters)
2. Start everything:
   ```
   docker compose up -d --build
   ```
3. Open <http://localhost:8080> and sign in with `SEED_REGISTRAR_EMAIL` and `SEED_REGISTRAR_PASSWORD`.

With `SEED_DEMO=true` (the default in `.env.example`) the first start also loads made-up students and
faculty so the screens aren't empty. Set it to `false` for an empty system.

| Command | What it does |
|---|---|
| `docker compose logs -f api` | Watch the backend logs |
| `docker compose down` | Stop everything (data is kept) |
| `docker compose down -v` | Stop and **delete all data** (start fresh) |
| `docker compose exec db psql -U ccs ccs_connect` | Look inside the database |

The seeded registrar and demo data are only created when the database is empty. Changing `.env`
afterwards does not change existing accounts; use `down -v` to start over.

## Develop the frontend

With the stack running, edit the React app with hot reload:

```
cd frontend
npm install
npm run dev        # http://localhost:5173, /api is forwarded to the Docker stack on :8080
```

## Importing accounts

Download the template from the Import page. Columns: `id_number, full_name, email, role, program, year,
section, academic_status, department, position, specialization`.

- `role` is Student, Faculty or Dean (blank means Student).
- Students need program (BSIT, BSIS, BSCS), year (1-4) and section. Academic status defaults to Regular.
- Faculty and dean rows need a department (IT Program, IS Program, CS Program). Faculty also need a position.
- Every email must end in `@qcu.edu.ph`. IDs and emails must be unique.
- Limits: 5 MB and 2,000 rows per file.

The server checks every row twice: once for the review screen and again when you confirm.

## Folder layout

```
backend/     Express API (routes, validation, database setup, demo data)
frontend/    React app + nginx config
html-version/  The original static HTML prototype (kept as a backup)
docker-compose.yml, .env.example
```

## Things to know before real use

- **Default passwords are predictable** (`Ccs@` followed by the ID number) and must be changed at first
  sign-in. That is fine for a demo; for real use, generate random passwords and deliver them securely.
- Only registrar accounts can sign in to this portal. Students, faculty and dean sign in through the
  apps still to be built.
- Serve the site over **HTTPS** in production and set `COOKIE_SECURE=true`.
- The database and API are not published to the network; only the web container is (port 8080).
- Back up the `db-data` Docker volume if the data matters.
>>>>>>> origin/registrar-portal
