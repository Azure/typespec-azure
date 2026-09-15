import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createVitest } from "vitest/node";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const packageRoot = resolve(repoRoot, "packages/typespec-ts");

async function discoverProjects(root: string, config: string, project?: string[]) {
  const vitest = await createVitest({
    root,
    config: resolve(root, config),
    project,
    watch: false,
  });
  try {
    const specifications = await vitest.globTestSpecifications();
    return vitest.projects.map((project) => ({
      name: project.name,
      include: project.config.include,
      testTimeout: project.config.testTimeout,
      files: specifications
        .filter((specification) => specification.project === project)
        .map((specification) =>
          relative(packageRoot, specification.moduleId).replaceAll("\\", "/"),
        ),
    }));
  } finally {
    await vitest.close();
  }
}

describe("TypeScript emitter test discovery", () => {
  it.each(["vitest.config.ts", "vitest.config.fast.ts"])(
    "%s only includes the smoke suite in repo-wide runs",
    async (config) => {
      const projects = await discoverProjects(repoRoot, config, ["*typespec-ts*"]);

      expect(projects).toHaveLength(1);
      expect(projects[0]).toMatchObject({
        name: "@azure-tools/typespec-ts",
        include: ["test-next/**/*.test.ts"],
        testTimeout: 10_000,
      });
      const files = projects.flatMap((project) => project.files);
      expect(files.length).toBeGreaterThan(0);
      expect(files.every((file) => file.startsWith("test-next/"))).toBe(true);
      expect(new Set(files).size).toBe(files.length);
    },
    30_000,
  );

  it("keeps standalone suites separate and selectable", async () => {
    const suites = [
      {
        name: "test-next",
        include: "test-next/**/*.test.ts",
        directory: "test-next/",
        timeout: 10_000,
      },
      {
        name: "unit-modular",
        include: "test/modular-unit/**/*.test.ts",
        directory: "test/modular-unit/",
        timeout: 0,
      },
      {
        name: "integration-azure-modular",
        include: "test/azure-modular-integration/*.test.ts",
        directory: "test/azure-modular-integration/",
        timeout: 36_000,
      },
    ];

    for (const suite of suites) {
      const projects = await discoverProjects(packageRoot, "vitest.config.ts", [suite.name]);
      expect(projects).toHaveLength(1);
      expect(projects[0]).toMatchObject({
        name: suite.name,
        include: [suite.include],
        testTimeout: suite.timeout,
      });
      const files = projects.flatMap((project) => project.files);
      expect(files.length).toBeGreaterThan(0);
      expect(files.every((file) => file.startsWith(suite.directory))).toBe(true);
    }
  }, 30_000);
});
