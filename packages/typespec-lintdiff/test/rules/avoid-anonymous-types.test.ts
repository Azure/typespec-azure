import { resolvePath } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { describe, it } from "vitest";
import { avoidAnonymousTypesRule } from "../../src/rules/avoid-anonymous-types.js";

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: ["@typespec/http"],
})
  .importLibraries()
  .using("TypeSpec.Http")
  .wrap((code) => `@service namespace Service { ${code} }`);

async function expectRule(code: string) {
  return createLinterRuleTester(
    await Tester.createInstance(),
    avoidAnonymousTypesRule,
    "tsp-lintdiff-local-linter",
  ).expect(code);
}

const diagnostic = {
  code: "tsp-lintdiff-local-linter/avoid-anonymous-types",
  message:
    "Operation response body should use a named model instead of an anonymous inline model expression.",
};

describe("avoid-anonymous-types", () => {
  it.each([
    "@get op read(): { value: string };",
    "@get op read(): { @statusCode status: 200; value: string };",
    "@get op read(): { @header etag: string; value: string };",
    "@get op read(): { first: string } & { second: string };",
    "model First { first: string; } model Second { second: string; } @get op read(): First & Second;",
    "model Fields { value: string; } @get op read(): { ...Fields; extra: string };",
    "alias Result = { value: string }; @get op read(): Result;",
    "namespace Nested { @get op read(): { value: string }; }",
    "model Node { next?: Node; } @get op read(): { first: Node; second: Node };",
  ])("reports implicit anonymous response: %s", async (code) => {
    await (await expectRule(code)).toEmitDiagnostics(diagnostic);
  });

  it.each([
    "model Result { value: string; } @get op read(): Result;",
    "model Base { value: string; } model Result extends Base {} @get op read(): Result;",
    "model Base { value: string; } model Result is Base; @get op read(): Result;",
    "model Fields { value: string; } @get op read(): { ...Fields };",
    "model Fields { value: string; } @get op read(): { @statusCode status: 200; ...Fields };",
    "@get op read(): { @body body: { value: string } };",
    "@get op read(): { @bodyRoot body: { value: string } };",
    "@get op read(): { @statusCode status: 204 };",
    "@get op read(): {};",
    "@get op read(): void;",
    "@get op read(): string;",
    "@get op read(): string[];",
    "@get op read(): Record<string>;",
    "model Result { values: Record<{ value: string }> } @get op read(): Result;",
    "op Template<T>(): T;",
    "interface Template<T> { read(): T; }",
  ])("preserves named, official-covered and template cases: %s", async (code) => {
    await (await expectRule(code)).toBeValid();
  });

  it("reports distinct response declarations separately", async () => {
    await (
      await expectRule(`
        @get op read():
          { @statusCode status: 200; first: string } |
          { @statusCode status: 400; second: string };
      `)
    ).toEmitDiagnostics([diagnostic, diagnostic]);
  });

  describe("original response constituents", () => {
    const first = "{ first: string }";
    const second = "{ second: int32 }";
    const json =
      '{ @statusCode status: 200; @header contentType: "application/json"; first: string }';
    const xml =
      '{ @statusCode status: 200; @header contentType: "application/xml"; second: int32 }';
    const named =
      'model Named { @statusCode status: 200; @header contentType: "application/json"; first: string; }';
    const spread = "{ ...Named }";

    it.each([
      {
        name: "plain union",
        declarations: "",
        result: `${first} | ${second}`,
        targets: [first, second],
      },
      {
        name: "plain union reversed",
        declarations: "",
        result: `${second} | ${first}`,
        targets: [second, first],
      },
      { name: "named first", declarations: named, result: `Named | ${xml}`, targets: [xml] },
      { name: "named last", declarations: named, result: `${xml} | Named`, targets: [xml] },
      { name: "two envelopes", declarations: "", result: `${json} | ${xml}`, targets: [json, xml] },
      {
        name: "two envelopes reversed",
        declarations: "",
        result: `${xml} | ${json}`,
        targets: [xml, json],
      },
      { name: "spread first", declarations: named, result: `${spread} | ${xml}`, targets: [xml] },
      { name: "spread last", declarations: named, result: `${xml} | ${spread}`, targets: [xml] },
      {
        name: "explicit body first",
        declarations: "",
        result: `{ @header contentType: "application/json"; @body body: ${first} } | ${xml}`,
        targets: [xml],
      },
      {
        name: "explicit body last",
        declarations: "",
        result: `${xml} | { @header contentType: "application/json"; @bodyRoot body: ${first} }`,
        targets: [xml],
      },
      {
        name: "nested shared unions",
        declarations: `alias First = ${first}; union Inner { First, ${second} } union Outer { Inner, First, string, null }`,
        result: "Outer",
        targets: [first, second],
      },
      {
        name: "shared envelope alias",
        declarations: `alias Shared = ${xml}; union Inner { Shared, Named }`,
        result: "Inner | Shared",
        targets: [xml],
        prefix: named,
      },
      {
        name: "non-model alternatives",
        declarations: "",
        result: `${first} | string | string[] | Record<string> | null`,
        targets: [first],
      },
    ])(
      "$name targets each original declaration once across operations",
      async ({ declarations, result, targets, prefix }) => {
        const source = `using TypeSpec.Http;
@service namespace Service;
${prefix ?? ""}
${declarations}
alias Result = ${result};
@get @route("/first") op first(): Result;
@get @route("/second") op second(): Result;`;
        const runner = await createTester(resolvePath(import.meta.dirname, "../.."), {
          libraries: ["@typespec/http"],
        })
          .importLibraries()
          .import("./responses.tsp")
          .files({ "responses.tsp": source })
          .createInstance();
        await createLinterRuleTester(runner, avoidAnonymousTypesRule, "tsp-lintdiff-local-linter")
          .expect("")
          .toEmitDiagnostics(
            targets.map((target) => ({
              ...diagnostic,
              file: /responses\.tsp$/,
              pos: source.indexOf(target),
            })),
          );
      },
    );
  });

  describe.each([
    { name: "no metadata", inside: "", outside: "" },
    { name: "header inside", inside: "@header etag: string;", outside: "" },
    { name: "status inside", inside: "@statusCode status: 200;", outside: "" },
    { name: "header outside", inside: "", outside: "@header etag: string;" },
    { name: "status outside", inside: "", outside: "@statusCode status: 200;" },
    {
      name: "header inside and status outside",
      inside: "@header etag: string;",
      outside: "@statusCode status: 200;",
    },
    {
      name: "status inside and header outside",
      inside: "@statusCode status: 200;",
      outside: "@header etag: string;",
    },
    {
      name: "header and status inside",
      inside: "@header etag: string; @statusCode status: 200;",
      outside: "",
    },
  ])("named response reuse with $name", ({ inside, outside }) => {
    it("accepts a complete spread", async () => {
      await (
        await expectRule(`
            model Fields { ${inside} value: string; }
            @get op read(): { ...Fields; ${outside} };
          `)
      ).toBeValid();
    });

    it("accepts the direct named response", async () => {
      await (
        await expectRule(`
            model Fields { ${inside} ${outside} value: string; }
            @get op read(): Fields;
          `)
      ).toBeValid();
    });

    it.each([false, true])(
      "checks one shared imported response; added payload: %s",
      async (addPayload) => {
        const source = `using TypeSpec.Http;
namespace Models;
model Fields { ${inside} value: string; }
alias Result = { ...Fields; ${outside} ${addPayload ? "extra: string;" : ""} };`;
        const runner = await createTester(resolvePath(import.meta.dirname, "../.."), {
          libraries: ["@typespec/http"],
        })
          .importLibraries()
          .import("./responses.tsp")
          .using("TypeSpec.Http")
          .files({ "responses.tsp": source })
          .createInstance();

        const expectation = createLinterRuleTester(
          runner,
          avoidAnonymousTypesRule,
          "tsp-lintdiff-local-linter",
        ).expect(
          `
            @service namespace Service {
              @get @route("/first") op first(): Models.Result;
              @get @route("/second") op second(): Models.Result;
            }
          `,
        );
        if (addPayload) {
          await expectation.toEmitDiagnostics({
            ...diagnostic,
            file: /responses\.tsp$/,
            pos: source.indexOf("{ ...Fields;"),
          });
        } else {
          await expectation.toBeValid();
        }
      },
    );
  });

  it("reports one shared source declaration across operations", async () => {
    await (
      await expectRule(`
        alias Result = { value: string };
        @get @route("/first") op first(): Result;
        @get @route("/second") op second(): Result;
      `)
    ).toEmitDiagnostics(diagnostic);
  });

  it("targets a shared anonymous declaration in an imported project file once", async () => {
    const importedTester = createTester(resolvePath(import.meta.dirname, "../.."), {
      libraries: ["@typespec/http"],
    })
      .importLibraries()
      .import("./models.tsp")
      .using("TypeSpec.Http")
      .files({ "models.tsp": "namespace Models; alias Result = { value: string };" });
    const runner = await importedTester.createInstance();
    await createLinterRuleTester(runner, avoidAnonymousTypesRule, "tsp-lintdiff-local-linter")
      .expect(
        `
        @service namespace Service {
          @get @route("/first") op first(): Models.Result;
          @get @route("/second") op second(): Models.Result;
        }
      `,
      )
      .toEmitDiagnostics({ ...diagnostic, file: /models\.tsp$/, pos: 33 });
  });
});
