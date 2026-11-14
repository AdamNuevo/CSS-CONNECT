import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `npm run dev` forwards /api to the running Docker stack (docker compose up).
// Point it somewhere else with VITE_API_TARGET if needed.
const target = process.env.VITE_API_TARGET || "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": { target, changeOrigin: false } } }
});
