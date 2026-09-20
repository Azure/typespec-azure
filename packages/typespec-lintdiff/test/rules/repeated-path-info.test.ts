import { getSourceLocation, resolvePath } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { repeatedPathInfoRule } from "../../src/rules/repeated-path-info.js";

vi.mock("@azure-tools/typespec-autorest", () => {
  throw new Error("Native lint must not load the AutoRest emitter.");
});
vi.mock("@azure-tools/typespec-client-generator-core", () => {
  throw new Error("Native lint must not load TCGC.");
});

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/openapi",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
}).importLibraries();

async function tester() {
  return createLinterRuleTester(
    await Tester.createInstance(),
    repeatedPathInfoRule,
    "tsp-lintdiff-local-linter",
  );
}

function diagnostic(name = "widgetName") {
  return {
    code: "tsp-lintdiff-local-linter/repeated-path-info",
    message: `Request body property '${name}' repeats information already carried in the path or query.`,
  };
}

const operation = `
  using TypeSpec.Http;
  @put @route("/widgets/{widgetName}")
  op create(@path widgetName: string, @body body: { properties: Properties }): void;
`;

describe("repeated-path-info native contract", () => {
  it.each([
    ["json-name-only", false],
    ["authored-name-only", true],
  ] as const)(
    "checks authored names in the supported ARM fixture %s",
    async (fixture, violates) => {
      const code = (
        await readFile(
          new URL(`../fixtures/RepeatedPathInfo/encoded-names/${fixture}.tsp`, import.meta.url),
          "utf8",
        )
      ).replace('import "../../lib/imports.tsp";', "");
      const expectation = (await tester()).expect(code);
      if (violates) {
        await expectation.toEmitDiagnostics([diagnostic()]);
      } else {
        await expectation.toBeValid();
      }
    },
  );

  it("targets the repeated authored property, including inherited properties", async () => {
    await (
      await tester()
    )
      .expect(
        `${operation}
        model Base { /*repeated*/widgetName?: string; }
        model Properties extends Base {}
      `,
      )
      .toEmitDiagnostics(({ repeated }) => ({
        ...diagnostic(),
        pos: getSourceLocation(repeated).pos,
        end: getSourceLocation(repeated).end,
      }));
  });

  it("uses supported HTTP parameter names rather than parameter source identifiers", async () => {
    await (
      await tester()
    )
      .expect(
        `
        using TypeSpec.Http;
        model Properties { wirePath?: string; wireQuery?: string; pathSource?: string; }
        @put @route("/widgets/{wirePath}")
        op create(@path("wirePath") pathSource: string, @query("wireQuery") querySource: string,
          @body body: { properties: Properties }): void;
      `,
      )
      .toEmitDiagnostics([diagnostic("wirePath"), diagnostic("wireQuery")]);
  });

  it("classifies a path/query wire-name collision as already rejected by HTTP", async () => {
    const [, diagnostics] = await Tester.compileAndDiagnose(`
      ${operation.replace("@body body:", '@query("widgetName") queryName: string, @body body:')}
      model Properties { widgetName?: string; }
    `);
    expect(diagnostics.map(({ code }) => code)).toEqual(["@typespec/http/incompatible-uri-param"]);
  });

  it("does not recurse into cycles or shared sibling models", async () => {
    await (
      await tester()
    )
      .expect(
        `
        ${operation}
        model Nested { widgetName?: string; parent?: Properties; }
        model Properties {
          self?: Properties;
          first?: Nested;
          second?: Nested;
        }
      `,
      )
      .toBeValid();
  });

  it("reports a shared declaration once per PUT operation at the same source target", async () => {
    await (
      await tester()
    )
      .expect(
        `
        ${operation}
        model Properties { /*repeated*/widgetName?: string; }
        @put @route("/other/{widgetName}")
        op other(@path widgetName: string, @body body: { properties: Properties }): void;
      `,
      )
      .toEmitDiagnostics(({ repeated }) =>
        [1, 2].map(() => ({
          ...diagnostic(),
          pos: getSourceLocation(repeated).pos,
          end: getSourceLocation(repeated).end,
        })),
      );
  });

  it("reports project-imported properties at their imported declaration", async () => {
    await (
      await tester()
    )
      .expect({
        "main.tsp": `import "./models.tsp"; ${operation}`,
        "models.tsp": "model Properties { /*repeated*/widgetName?: string; }",
      })
      .toEmitDiagnostics(({ repeated }) => ({
        ...diagnostic(),
        pos: getSourceLocation(repeated).pos,
        end: getSourceLocation(repeated).end,
      }));
  });

  it("ignores PATCH, top-level duplicates, and non-model properties bags", async () => {
    await (
      await tester()
    )
      .expect(
        `
        using TypeSpec.Http;
        @patch @route("/patch/{widgetName}")
        op update(@path widgetName: string,
          @body body: { properties: { widgetName?: string } }): void;
        @put @route("/top/{widgetName}")
        op top(@path widgetName: string,
          @body body: { widgetName?: string; properties: { description?: string } }): void;
        @put @route("/scalar/{widgetName}")
        op scalarBag(@path widgetName: string, @body body: { properties: string }): void;
      `,
      )
      .toBeValid();
  });

  it("skips template sources but checks their concrete aliases", async () => {
    await (
      await tester()
    )
      .expect(
        `
        using TypeSpec.Http;
        model Properties { widgetName?: string; }
        @put op Template<T>(@path widgetName: string, @body body: { properties: T }): void;
        interface Templates<T> {
          @put op create(@path widgetName: string, @body body: { properties: T }): void;
        }
        @route("/widgets/{widgetName}") op create is Template<Properties>;
      `,
      )
      .toEmitDiagnostics([diagnostic()]);
  });
});
