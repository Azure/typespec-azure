import alloyPlugin from "@alloy-js/rollup-plugin";
import { defineConfig, mergeConfig } from "vitest/config";
import { defaultTypeSpecVitestConfig } from "../../core/vitest.config.js";

export default mergeConfig(
  defaultTypeSpecVitestConfig,
  defineConfig({
    esbuild: {
      jsx: "preserve",
      jsxImportSource: "@alloy-js/core",
    },
    oxc: false,
    plugins: [alloyPlugin()],
    resolve: {
      conditions: ["development"],
      dedupe: ["@alloy-js/core"],
    },
    test: {
      setupFiles: ["./test/vitest.setup.ts"],
      testTimeout: 30000,
    },
  }),
);
