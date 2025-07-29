import { defineConfig, mergeConfig } from "vitest/config";
import { defaultTypeSpecVitestConfig } from "./core/vitest.config.js";

export default mergeConfig(
  defaultTypeSpecVitestConfig,
  defineConfig({
    test: {
      projects: [
        "packages/*/vitest.config.ts",
        "core/packages/*/vitest.config.ts",
        "packages/*/vitest.config.mts",
        "core/packages/*/vitest.config.mts",
      ],
    },
  }),
);
