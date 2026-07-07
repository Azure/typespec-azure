import { defineConfig, mergeConfig } from "vitest/config";
import { defaultTypeSpecVitestConfig } from "./core/vitest.config.js";

export default mergeConfig(
  defaultTypeSpecVitestConfig,
  defineConfig({
    test: {
      // Exclude core packages so we can only run test for this repo
      projects: ["packages/*/vitest.config.ts", "packages/*/vitest.config.mts"],
    },
  }),
);
