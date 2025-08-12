import { defineConfig, mergeConfig } from "vitest/config";

import { defaultTypeSpecVitestConfig } from "../../core/vitest.config";
export default mergeConfig(
  defaultTypeSpecVitestConfig,
  defineConfig({
    test: {
      testTimeout: 30000,
    },
  }),
);
