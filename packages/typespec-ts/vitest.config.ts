import { defineConfig } from "vitest/config";

// The repo-wide run (root `vitest.config.ts` / `vitest.config.fast.ts`) picks up
// this file as a single project and — in Vitest 4 — ignores the nested `projects`,
// using only these top-level `test` options. We deliberately include ONLY the fast
// `test-next` suite there: it is a quick cross-package smoke net (~14s). The heavy
// `unit-modular` suite (~150s of TypeSpec compiles) is intentionally excluded from
// the repo-wide run to keep it fast; it still runs in full via `pnpm unit-test`
// locally and in the dedicated `ci-typescript.yml` job — which also triggers on
// the TypeSpec libraries typespec-ts emits from (`typespec-client-generator-core`
// and `typespec-azure-resource-manager`), so cross-package emit regressions are
// still caught. The Spector end-to-end `integration-azure-modular`
// project needs generated clients and a running test server, so it too is excluded
// here and runs via its own script / the dedicated e2e CI job.
const repoWideInclude = ["test-next/**/*.test.ts"];

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
    include: repoWideInclude,
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
