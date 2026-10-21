import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  aggregateResults,
  buildTempConfig,
  getValidatorExtensionReference,
  keepOutputFileInsideEmitterDirectory,
  parseViolations,
  retainLatestSwagger,
  selectLatestApiVersion,
  updateAutorestOption,
} from "./spec-dataset.js";

const project = {
  sourcePath: "specification/contoso/resource-manager/Microsoft.Contoso/Contoso",
  projectDir: "C:\\specs\\contoso",
  entrypoint: "main.tsp",
  tspConfigPath: "C:\\specs\\contoso\\tspconfig.yaml",
};

describe("spec dataset results", () => {
  it("retains relocated reference closures outside a project output but inside the dataset", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "lintdiff-reference-test-"));
    try {
      const source = path.join(directory, "source", "project");
      const dataset = path.join(directory, "dataset");
      const output = path.join(dataset, "projects", "demo", "swagger");
      const relative = path.join("stable", "2026-01-01");
      fs.mkdirSync(path.join(source, relative), { recursive: true });
      fs.mkdirSync(path.join(directory, "source", "common"), { recursive: true });
      fs.mkdirSync(path.join(output, relative), { recursive: true });
      const common = '{"definitions":{"Flag":{"type":"boolean"}}}';
      fs.writeFileSync(path.join(directory, "source", "common", "types.json"), common);
      fs.writeFileSync(path.join(directory, "secret.json"), '{"private":true}');
      fs.writeFileSync(
        path.join(source, relative, "shared.json"),
        '{"definitions":{"Flag":{"$ref":"../../../common/types.json#/definitions/Flag"},"Outside":{"$ref":"../../../../secret.json"}}}',
      );
      const main = path.join(output, relative, "main.json");
      fs.writeFileSync(
        main,
        '{"swagger":"2.0","info":{"version":"2026-01-01"},"definitions":{"Flag":{"$ref":"./shared.json#/definitions/Flag"}}}',
      );
      retainLatestSwagger(
        output,
        [{ absolutePath: main, apiVersion: "2026-01-01" }],
        source,
        dataset,
        path.join(directory, "source"),
      );
      expect(
        fs.readFileSync(path.join(dataset, "projects", "demo", "common", "types.json"), "utf8"),
      ).toBe(common);
      expect(fs.readFileSync(path.join(output, relative, "shared.json"), "utf8")).toContain(
        "../../../common/types.json#/definitions/Flag",
      );
      expect(fs.existsSync(path.join(dataset, "projects", "secret.json"))).toBe(false);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it("disables source service metadata writes in the temporary emitter configuration", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "lintdiff-config-test-"));
    try {
      const config = path.join(directory, "tspconfig.yaml");
      const original = 'emit: ["@azure-tools/typespec-autorest"]\n';
      fs.writeFileSync(config, original);
      const temporary = buildTempConfig(
        { ...project, projectDir: directory, tspConfigPath: config },
        path.join(directory, "swagger"),
        path.join(directory, "common-types"),
      );
      expect(fs.readFileSync(temporary, "utf8")).toContain('service-yaml: "never"');
      expect(fs.readFileSync(config, "utf8")).toBe(original);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it("passes local validator paths as file URLs instead of package-name references", () => {
    const root = path.resolve("specs with spaces");
    const reference = getValidatorExtensionReference(root);
    expect(reference).toMatch(/^file:\/\//);
    expect(reference).toContain("specs%20with%20spaces");
    expect(fileURLToPath(reference)).toBe(
      path.join(root, "node_modules", "@microsoft.azure", "openapi-validator") + path.sep,
    );
  });

  it("keeps validator violations and ignores other AutoRest output", () => {
    const stdout = [
      JSON.stringify({ level: "information", message: "starting" }),
      JSON.stringify({
        level: "warning",
        code: "ExampleRule",
        message: "first",
        details: { jsonpath: ["definitions", "Widget"] },
      }),
      "not json",
      JSON.stringify({
        level: "error",
        code: "ExampleRule",
        message: "second",
      }),
      JSON.stringify({
        level: "fatal",
        code: "FatalRule",
        message: "third",
      }),
    ].join("\n");

    expect(parseViolations(stdout, project, "swagger/contoso.json")).toEqual([
      {
        rule: "ExampleRule",
        level: "warning",
        project: project.sourcePath,
        swaggerFile: "swagger/contoso.json",
        message: "first",
        path: ["definitions", "Widget"],
        details: { jsonpath: ["definitions", "Widget"] },
      },
      {
        rule: "ExampleRule",
        level: "error",
        project: project.sourcePath,
        swaggerFile: "swagger/contoso.json",
        message: "second",
        path: [],
      },
      {
        rule: "FatalRule",
        level: "fatal",
        project: project.sourcePath,
        swaggerFile: "swagger/contoso.json",
        message: "third",
        path: [],
      },
    ]);
  });

  it("groups normalized results by validator rule and level", () => {
    const violations = parseViolations(
      [
        JSON.stringify({ level: "warning", code: "RuleB", message: "one" }),
        JSON.stringify({ level: "error", code: "RuleA", message: "two" }),
        JSON.stringify({ level: "warning", code: "RuleA", message: "three" }),
      ].join("\n"),
      project,
      "swagger/contoso.json",
    );

    const aggregate = aggregateResults("0123456789abcdef", "2026-08-06T00:00:00.000Z", violations);

    expect(aggregate.totalViolations).toBe(3);
    expect(Object.keys(aggregate.rules)).toEqual(["RuleA", "RuleB"]);
    expect(aggregate.rules.RuleA).toMatchObject({
      count: 2,
      levels: { error: 1, warning: 1 },
    });
    expect(aggregate.rules.RuleB).toMatchObject({
      count: 1,
      levels: { warning: 1 },
    });
  });

  it("adds AutoRest options when another emitter already owns the options block", () => {
    const config = [
      'emit: ["@azure-tools/typespec-autorest"]',
      "options:",
      '  "@azure-tools/typespec-python":',
      '    emitter-output-dir: "{output-dir}/python"',
      "",
    ].join("\n");

    const updated = updateAutorestOption(config, "emitter-output-dir", "C:/dataset/swagger");
    expect(updated).toContain(
      ['  "@azure-tools/typespec-autorest":', '    emitter-output-dir: "C:/dataset/swagger"'].join(
        "\n",
      ),
    );
    expect(updated.match(/^options:/gm)).toHaveLength(1);
  });

  it("selects the newest API date regardless of stable or preview status", () => {
    expect(selectLatestApiVersion(["2024-10-01", "2025-01-15-preview", "2023-11-01"])).toBe(
      "2025-01-15-preview",
    );
  });

  it("keeps output files inside the overridden emitter directory", () => {
    expect(
      keepOutputFileInsideEmitterDirectory(
        '    output-file: "{project-root}/{version-status}/{version}/hci.json"',
      ),
    ).toBe('    output-file: "{version-status}/{version}/hci.json"');
    expect(keepOutputFileInsideEmitterDirectory("    output-file: ../../stable/openapi.json")).toBe(
      "    output-file: stable/openapi.json",
    );
  });
});
