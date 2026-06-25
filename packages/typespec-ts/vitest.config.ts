import { readdirSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const SCENARIOS_ROOT = path.join("test", "modular-unit", "scenarios");
const SCENARIO_ENTRY = "test/modular-unit/scenario-suite.entry.ts";

/**
 * Discover every "leaf" scenario directory — i.e. every directory that directly
 * contains at least one `.md` scenario file — as posix paths relative to
 * `SCENARIOS_ROOT`, sorted. One vitest project is created per leaf directory so
 * vitest's `forks` pool can run them concurrently across worker processes,
 * without committing a generated test file per directory.
 */
function getLeafScenarioDirs(root: string): string[] {
  const result: string[] = [];
  function walk(dir: string): void {
    let hasMd = false;
    for (const child of readdirSync(dir)) {
      const fullPath = path.join(dir, child);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (child.endsWith(".md")) {
        hasMd = true;
      }
    }
    if (hasMd) {
      result.push(path.relative(root, dir).split(path.sep).join("/"));
    }
  }
  walk(root);
  return result.sort();
}

const modularPool = {
  testTimeout: 0,
  pool: "forks" as const,
  execArgv: ["--max-old-space-size=1024"],
};

const scenarioProjects = getLeafScenarioDirs(path.join(packageDir, SCENARIOS_ROOT)).map((dir) => ({
  test: {
    name: `unit-modular:${dir}`,
    include: [SCENARIO_ENTRY],
    provide: { scenarioDir: dir },
    ...modularPool,
  },
}));

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "test-next",
          include: ["test-next/**/*.test.ts"],
        },
      },
      // Scenario suites: one project per leaf scenario directory, computed from
      // the directory tree at config-load time (see `scenario-suite.entry.ts`).
      ...scenarioProjects,
      // Remaining modular unit tests that are not scenario `.md` suites.
      {
        test: {
          name: "unit-modular",
          include: ["test/modular-unit/**/*.test.ts"],
          ...modularPool,
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
