import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/unittest/**/*.test.ts"],
    passWithNoTests: true,
  },
});
