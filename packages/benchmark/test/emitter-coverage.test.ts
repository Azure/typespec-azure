import { NodeHost, resolveCompilerOptions } from "@typespec/compiler";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const expectedEmitters = [
  "@azure-tools/typespec-autorest",
  "@typespec/openapi3",
  "@azure-tools/typespec-python",
  "@typespec/http-client-js",
  "@azure-tools/typespec-ts",
  "@azure-tools/typespec-java",
  "@azure-tools/typespec-go",
  "@azure-typespec/http-client-csharp",
  "@azure-tools/typespec-client-generator-core",
];

const root = fileURLToPath(new URL("../", import.meta.url));

for (const dataset of ["specs", "external-spec"]) {
  describe(dataset, async () => {
    const specs = await readdir(join(root, dataset), { withFileTypes: true });
    for (const spec of specs.filter((entry) => entry.isDirectory())) {
      it(`${spec.name} runs every HTTP emitter with isolated output`, async () => {
        const dir = join(root, dataset, spec.name);
        const [options, diagnostics] = await resolveCompilerOptions(NodeHost, {
          entrypoint: join(dir, "main.tsp"),
          cwd: dir,
          configPath: join(dir, "tspconfig.yaml"),
        });
        expect(diagnostics).toEqual([]);
        const emitters = expectedEmitters.filter(
          (name) =>
            dataset !== "external-spec" ||
            (name !== "@typespec/openapi3" &&
              (spec.name !== "network" || name !== "@azure-tools/typespec-ts")),
        );
        expect(options.emit).toEqual(emitters);
        const outputs = emitters.map(
          (emitter) =>
            options.options?.[emitter]?.["emitter-output-dir"] ?? join(options.outputDir!, emitter),
        );
        expect(new Set(outputs).size).toBe(emitters.length);
        expect(options.options?.["@azure-tools/typespec-go"]?.module).toBeTruthy();
        expect(options.options?.["@azure-typespec/http-client-csharp"]?.namespace).toBeTruthy();
      });
    }
  });
}

it("declares every workspace emitter as a benchmark dependency", async () => {
  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  for (const emitter of expectedEmitters.filter((name) => !name.startsWith("@azure-typespec/"))) {
    expect(pkg.dependencies).toHaveProperty(emitter, "workspace:^");
  }
  expect(pkg.dependencies["@azure-typespec/http-client-csharp"]).toBeUndefined();
});
