import { defineConfig } from "vitest/config";

// `include` only lists the unit suites (`test-next` + `unit-modular`). When this
// package is run on its own (`pnpm test-next`, `pnpm unit-test`,
// `pnpm integration-test:alone`) the named `projects` below take over and this
// top-level config is ignored. When the repo-wide run picks up this file as a
// single project via the root `vitest.config.ts`/`vitest.config.fast.ts`, vitest
// ignores the nested `projects` and uses these top-level options instead — so only
// the unit suites run there, with the same timeout/pool settings the
// `unit-modular` project relies on. The Spector end-to-end
// `integration-azure-modular` project needs generated clients and a running test
// server, so it is intentionally left out of `include` and runs via its own
// script / the dedicated e2e CI job.
const unitTestInclude = ["test-next/**/*.test.ts", "test/modular-unit/**/*.test.ts"];

// Settings the `unit-modular` suites need (heavy TypeSpec compiles). Applied at
// the top level so they also take effect in the single-project repo-wide run.
const unitModularPool = {
  testTimeout: 0,
  pool: "forks" as const,
  poolOptions: {
    forks: {
      execArgv: ["--max-old-space-size=1024"],
    },
  },
};

export default defineConfig({
  test: {
    include: unitTestInclude,
    ...unitModularPool,
    projects: [
      {
        test: {
          name: "test-next",
          include: ["test-next/**/*.test.ts"],
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
