import { defineConfig } from "vitest/config";
import path from "node:path";

// Integration tests that need a real database. Opt-in via TEST_DATABASE_URL.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
  },
});
