import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/unittest/**/*.test.ts"],
    passWithNoTests: true,
    // Compiling TypeSpec (especially ARM scenarios, which load the heavy
    // Azure.ResourceManager libraries) can exceed the default 5s timeout under
    // parallel load.
    testTimeout: 60_000,
  },
});
