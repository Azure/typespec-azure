import { defineConfig, mergeConfig } from "vitest/config";
import { defaultTypeSpecVitestConfig } from "../../core/vitest.workspace";

export default mergeConfig(
  defaultTypeSpecVitestConfig,
  defineConfig({
    test: {
      testTimeout: 10_000,
    },
  }),
);
