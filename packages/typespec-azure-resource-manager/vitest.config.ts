import { defineConfig } from "vitest/config";
import { defaultTypeSpecVitestConfig } from "../../core/vitest.workspace";

export default mergeConfig(defaultTypeSpecVitestConfig, defineConfig({}));
