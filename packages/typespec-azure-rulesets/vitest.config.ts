import { defineConfig, mergeConfig } from "vitest/config";
import { defaultTypeSpecVitestConfig } from "../../core/vitest.workspace.js";

export default mergeConfig(defaultTypeSpecVitestConfig, defineConfig({}));
