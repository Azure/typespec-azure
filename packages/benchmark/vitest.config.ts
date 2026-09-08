import { defineConfig, mergeConfig } from "vitest/config";
import { defaultTypeSpecVitestConfig } from "../../core/vitest.config.js";

export default mergeConfig(
  defaultTypeSpecVitestConfig,
  defineConfig({
    test: {
      // Running the benchmarks locally emits generated clients next to the
      // specs, and those ship their own sample tests.
      exclude: ["**/node_modules/**", "**/dist/**", "specs/*/tsp-output/**"],
    },
  }),
);
