import { defineProject } from "vitest/config";

export const testNextConfig = {
  include: ["test-next/**/*.test.ts"],
  // ts-morph type checking needs headroom under repo-wide CPU/memory pressure.
  testTimeout: 10_000,
};

// Keep heavy unit tests and Spector tests in the dedicated TypeScript CI jobs.
export default defineProject({
  test: testNextConfig,
});
