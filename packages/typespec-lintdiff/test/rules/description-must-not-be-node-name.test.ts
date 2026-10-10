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
    ['union State { @doc("Ready.") Ready: "available", string }', "Ready", "Ready."],
    ['union State { @doc("ready") "ready", string }', "ready", "ready"],
    ['model Widget { @key @doc("id") id: string; }', "id", "id"],
    ['model Widget { @doc("sku") sku: string; }', "sku", "sku"],
    ['@doc("description.") model Widget {}', "Widget", "description."],
    ['@get @doc("get.") op read(): string;', "get", "get."],
    ['@route("/widgets") @doc(" GET. ") op read(): string;', "get", " GET. "],
    ['@route("/widgets") @doc("post") op create(@body body: string): string;', "post", "post"],
    [
      'model Widget { @encodedName("application/json", "wire-name") @doc(" Wire-Name. ") sourceName: string; }',
      "wire-name",
      " Wire-Name. ",
    ],
    [
      'model Widget { @encodedName("application/json", "wire-name") @doc("description.") sourceName: string; }',
      "wire-name",
      "description.",
    ],
    ['@route("/widgets") @doc("description.") op read(): string;', "get", "description."],
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
    await tester
      .expect(
        `${route} @get op read(@${kind}("wireName") @encodedName("application/json", "jsonName") @doc("wireName.") source: string): string;`,
      )
      .toEmitDiagnostics([diagnostic("wireName", "wireName.")]);
    await tester
      .expect(
        `${route} @get op read(@${kind}("wireName") @encodedName("application/json", "jsonName") @doc("jsonName") source: string): string;`,
      )
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
    '@route("/widgets") @doc("read") op read(): string;',
    '@route("/widgets") @doc("create") op create(@body body: string): string;',
    '@route("/widgets") @get @doc("post") op read(): string;',
    '@route("/widgets") @post @doc("get") op create(): string;',
    'model Widget { @encodedName("application/json", "wire-name") @doc("sourceName") sourceName: string; }',
    'model Widget { @encodedName("application/xml", "wire-name") @doc("wire-name") sourceName: string; }',
    'model Response { @statusCode @encodedName("application/json", "wire-status") @doc("wire-status") status: 200; }',
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

  it("targets inferred operations and JSON-renamed properties", async () => {
    await tester
      .expect(
        `
        @route("/widgets") @doc("get") op /*read*/read(): string;
        @route("/widgets") @doc("post") op /*create*/create(@body body: string): string;
        model Widget {
          @encodedName("application/json", "wire-name")
          @doc("wire-name")
          /*source*/sourceName: string;
        }
      `,
      )
      .toEmitDiagnostics(({ read, create, source }) =>
        [
          [source, "wire-name"],
          [read, "get"],
          [create, "post"],
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

  it.each([
    'HttpPart<string, #{name: "part_name"}>',
    'HttpPart<UploadText, #{name: "part_name"}>',
    'HttpPart<string[], #{name: "part_name"}>',
    'HttpPart<string, #{name: "part_name"}>[]',
  ])("compares authored multipart names on %s", async (partType) => {
    const operation = (doc: string) => `
      scalar UploadText extends string;
      op upload(
        @header contentType: "multipart/form-data",
        @multipartBody body: {
          @doc("${doc}") /*part*/propName: ${partType};
        }
      ): void;
    `;
    await tester.expect(operation(" Part_Name. ")).toEmitDiagnostics(({ part }) => {
      const location = getSourceLocation(part);
      return [
        {
          ...diagnostic("part_name", " Part_Name. "),
          file: location.file.path,
          pos: location.pos,
          end: location.end,
        },
      ];
    });
    await tester.expect(operation("propName")).toBeValid();
    await tester.expect(operation("The text submitted for processing.")).toBeValid();
    await tester
      .expect(operation("description."))
      .toEmitDiagnostics([diagnostic("part_name", "description.")]);
  });

  it("uses the default multipart property name when no part name is authored", async () => {
    await tester
      .expect(
        `
        op upload(
          @header contentType: "multipart/form-data",
          @multipartBody body: { @doc("propName") propName: HttpPart<string>; }
        ): void;
      `,
      )
      .toEmitDiagnostics([diagnostic("propName", "propName")]);
  });

  it("preserves authored multipart names over JSON encoded names", async () => {
    const operation = (doc: string) => `
      op upload(
        @header contentType: "multipart/form-data",
        @multipartBody body: {
          @encodedName("application/json", "jsonName")
          @doc("${doc}") propName: HttpPart<string, #{name: "part_name"}>;
        }
      ): void;
    `;
    await tester
      .expect(operation("part_name"))
      .toEmitDiagnostics([diagnostic("part_name", "part_name")]);
    await tester.expect(operation("jsonName")).toBeValid();
  });
});
