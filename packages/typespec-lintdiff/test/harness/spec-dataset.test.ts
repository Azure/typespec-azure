import { describe, expect, it } from "vitest";
import {
  aggregateResults,
  parseViolations,
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
});
