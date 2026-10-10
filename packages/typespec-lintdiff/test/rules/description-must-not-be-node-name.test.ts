import { getSourceLocation, resolvePath } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { descriptionMustNotBeNodeNameRule } from "../../src/rules/description-must-not-be-node-name.js";

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: ["@typespec/http"],
})
  .importLibraries()
  .using("TypeSpec.Http");

let tester: ReturnType<typeof createLinterRuleTester>;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    descriptionMustNotBeNodeNameRule,
    "tsp-lintdiff-local-linter",
  );
});

function diagnostic(name: string, description: string) {
  return {
    code: "tsp-lintdiff-local-linter/description-must-not-be-node-name",
    message: `Description must not match the name of the node it describes. Node name:'${name}' Description:'${description}'`,
  };
}

describe("description-must-not-be-node-name", () => {
  it.each([
    ['@doc("Widget") model Widget {}', "Widget", "Widget"],
    ['@doc(" Widget. ") model Widget {}', "Widget", " Widget. "],
    ["/** widget */ model Widget {}", "Widget", "widget"],
    ['@doc("Label.") scalar Label extends string;', "Label", "Label."],
    ['@doc("State") enum State { Ready }', "State", "State"],
    ['@doc("State") union State { Ready: "ready", string }', "State", "State"],
    ['enum State { @doc("Ready.") Ready: "ready" }', "Ready", "Ready."],
    ['union State { @doc("Ready.") Ready: "ready", string }', "Ready", "Ready."],
    ['union State { @doc("ready") "ready", string }', "ready", "ready"],
    ['model Widget { @key @doc("id") id: string; }', "id", "id"],
    ['model Widget { @doc("sku") sku: string; }', "sku", "sku"],
    ['@doc("description.") model Widget {}', "Widget", "description."],
    ['@get @doc("get.") op read(): string;', "get", "get."],
  ])("reports uninformative documentation: %s", async (code, name, doc) => {
    await tester.expect(code).toEmitDiagnostics([diagnostic(name, doc)]);
  });

  it.each(["path", "query", "header"])("checks the %s parameter wire name", async (kind) => {
    const route = kind === "path" ? '@route("/widgets/{wireName}")' : "";
    await tester
      .expect(
        `${route} @get op read(@${kind}("wireName") @doc("wireName.") source: string): string;`,
      )
      .toEmitDiagnostics([diagnostic("wireName", "wireName.")]);
    await tester
      .expect(`${route} @get op read(@${kind}("wireName") @doc("source") source: string): string;`)
      .toBeValid();
  });

  it.each([
    "model Widget {}",
    '@doc("") model Widget {}',
    '@doc("  ...  ") model Widget {}',
    '@doc("A widget available in the store.") model Widget {}',
    'enum State { @doc("The widget is ready for use.") Ready }',
    'enum State { @doc("wire-value") Ready: "wire-value" }',
    'union State { @doc("The widget is ready for use.") Ready: "ready", string }',
    "enum State { Ready }",
    'union State { Ready: "ready", string }',
    'model Response { @statusCode @doc("status") status: 200; }',
    '@get @doc("read") op read(): string;',
  ])("accepts compliant or excluded documentation: %s", async (code) => {
    await tester.expect(code).toBeValid();
  });

  it("targets each offending declaration without an aggregate diagnostic", async () => {
    await tester
      .expect(
        `
        enum State { @doc("Ready") /*ready*/Ready }
        model Widget { @key @doc("id") /*id*/id: string; }
      `,
      )
      .toEmitDiagnostics(({ ready, id }) =>
        [
          [id, "id"],
          [ready, "Ready"],
        ].map(([target, name]) => {
          const location = getSourceLocation(target as Parameters<typeof getSourceLocation>[0]);
          return {
            ...diagnostic(name as string, name as string),
            file: location.file.path,
            pos: location.pos,
            end: location.end,
          };
        }),
      );
  });
});
