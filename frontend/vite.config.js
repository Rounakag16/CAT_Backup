import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server proxies /tasks, /events, /safety, /training, /predict to the
// zero-dependency Node backend on :4000, so the frontend never needs CORS
// config beyond what backend/src/server.js already sends. Production builds
// (npm run build) still read VITE_API_URL directly — see src/api.js.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/tasks": "http://localhost:4000",
      "/events": "http://localhost:4000",
      "/safety": "http://localhost:4000",
      "/training": "http://localhost:4000",
      "/predict": "http://localhost:4000",
    },
  },
  build: {
    outDir: "dist",
  },
});
