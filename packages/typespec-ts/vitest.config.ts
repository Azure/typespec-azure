import { defineConfig, mergeConfig } from "vitest/config";
import { defaultTypeSpecVitestConfig } from "../../core/vitest.config.js";

export default mergeConfig(
  defaultTypeSpecVitestConfig,
  defineConfig({
    test: {
      exclude: [
        "test/integration/*.spec.ts",
        "test/azureIntegration/*.spec.ts",
        "test/modularIntegration/*.spec.ts",
        "test/azureModularIntegration/*.spec.ts"
      ],
      projects: [
        {
          test: {
            name: "test-next",
            include: ["test-next/**/*.test.ts"]
          }
        },
        {
          test: {
            name: "unit-rlc",
            include: ["test/unit/**/*.spec.ts"],
            testTimeout: 36000
          }
        },
        {
          test: {
            name: "unit-modular",
            include: ["test/modularUnit/**/*.spec.ts"],
            testTimeout: 0,
            pool: "forks"
          }
        }
      ]
    }
  })
);
