import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Browser time zone for the run. Default is India (the app's audience);
// `npm run test:tz` repeats the suite in New York to catch date drift.
process.env.TZ = process.env.TEST_TZ || "Asia/Kolkata";

export default defineConfig({
  plugins: [react()],
  // point Vite at an empty folder so tests never read frontend/.env
  envDir: fileURLToPath(new URL("./test/no-env", import.meta.url)),
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.js"],
    env: { VITE_API_URL: "http://api.test" },
    coverage: {
      include: ["src/utils/**", "src/hooks/**", "src/context/**", "src/services/**"],
    },
  },
});
