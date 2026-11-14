import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { migrate } from "./migrate.js";
import { requireRegistrar } from "./auth.js";
import authRoutes from "./routes/auth.js";
import peopleRoutes from "./routes/people.js";
import importRoutes from "./routes/import.js";

const required = ["DATABASE_URL", "JWT_SECRET"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing ${key}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be at least 32 characters. Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"");
  process.exit(1);
}

const app = express();
app.set("trust proxy", 1); // we sit behind nginx, so use the real client IP for rate limiting
app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "4mb" })); // room for a 2 MB profile picture as base64
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api", requireRegistrar, peopleRoutes, importRoutes);

app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "File is larger than 5 MB." });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Bad request." });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "That upload is too large." });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side. Please try again." });
});

// the database container may still be starting, so retry for a while
async function start() {
  for (let attempt = 1; ; attempt++) {
    try {
      await migrate();
      break;
    } catch (err) {
      if (attempt >= 20 || !/ECONNREFUSED|ENOTFOUND|starting up|EAI_AGAIN/.test(String(err.message) + String(err.code))) throw err;
      console.log(`Waiting for the database (${attempt})...`);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`API listening on :${port}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
