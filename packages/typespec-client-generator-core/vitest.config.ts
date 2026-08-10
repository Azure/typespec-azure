import { defineConfig, mergeConfig } from "vitest/config";
import { defaultTypeSpecVitestConfig } from "../../core/vitest.config.js";

export default mergeConfig(
  defaultTypeSpecVitestConfig,
  defineConfig({
    test: {
      environment: "node",
      testTimeout: 10000,
      isolate: false,
      coverage: {
        reporter: ["cobertura", "json", "text"],
      },
      outputFile: {
        junit: "./test-results.xml",
      },
    },
  }),
);
