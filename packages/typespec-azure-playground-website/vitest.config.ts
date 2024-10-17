import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import { defaultTypeSpecVitestConfig } from "../../core/vitest.workspace.js";

export default mergeConfig(
  defaultTypeSpecVitestConfig,
  defineConfig({
    test: {
      exclude: [...configDefaults.exclude, "dist-dev/**/*"],
    },
  }),
);
