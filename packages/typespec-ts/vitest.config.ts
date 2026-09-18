import { defineConfig } from "vitest/config";
import { testNextConfig } from "./vitest.config.repo.js";

// Settings the `unit-modular` suites need (heavy TypeSpec compiles): no per-test
// timeout and a raised heap. In Vitest 4 `poolOptions` was removed — its
// sub-options (here `execArgv`) are now top-level `test.*` fields, set per-project.
const unitModularPool = {
  testTimeout: 0,
  pool: "forks" as const,
  execArgv: ["--max-old-space-size=1024"],
};

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "test-next",
          ...testNextConfig,
        },
      },
      {
        test: {
          name: "unit-modular",
          include: ["test/modular-unit/**/*.test.ts"],
          ...unitModularPool,
        },
      },
      {
        test: {
          name: "integration-azure-modular",
          include: ["test/azure-modular-integration/*.test.ts"],
          testTimeout: 36000,
        },
      },
    ],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "json", "html"],
      include: [
        "src/modular/serialization/**/*.ts",
        "src/framework/**/*.ts",
        "static/static-helpers/**/*.ts",
      ],
      exclude: ["**/*.test.ts", "**/*.test.tsx", ".next/*"],
    },
  },
});
