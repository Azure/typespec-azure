import { Tester } from "#test/test-host.js";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noUnnamedResponseBodiesRule } from "../../src/rules/no-unnamed-response-bodies.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.wrap(
    (code) => `@service namespace Service { ${code} }`,
  ).createInstance();
  tester = createLinterRuleTester(
    runner,
    noUnnamedResponseBodiesRule,
    "@azure-tools/typespec-azure-core",
  );
});

const diagnostic = {
  code: "@azure-tools/typespec-azure-core/no-unnamed-response-bodies",
  message:
    "Operation response body should use a named model instead of an anonymous inline model expression.",
};

describe("no-unnamed-response-bodies", () => {
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
    await tester.expect(code).toEmitDiagnostics(diagnostic);
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
    await tester.expect(code).toBeValid();
  });

  it("reports distinct response declarations separately", async () => {
    await tester
      .expect(
        `
      @get op read():
        { @statusCode status: 200; first: string } |
        { @statusCode status: 400; second: string };
    `,
      )
      .toEmitDiagnostics([diagnostic, diagnostic]);
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

    describe.each([
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
    ])("$name", ({ declarations, result, targets, prefix }) => {
      const source = `using TypeSpec.Http;
@service namespace Service;
${prefix ?? ""}
${declarations}
alias Result = ${result};
@get @route("/first") op first(): Result;
@get @route("/second") op second(): Result;`;

      beforeEach(async () => {
        const runner = await Tester.import("./responses.tsp")
          .files({ "responses.tsp": source })
          .createInstance();
        tester = createLinterRuleTester(
          runner,
          noUnnamedResponseBodiesRule,
          "@azure-tools/typespec-azure-core",
        );
      });

      it("targets each original declaration once across operations", async () => {
        await tester.expect("").toEmitDiagnostics(
          targets.map((target) => ({
            ...diagnostic,
            file: /responses\.tsp$/,
            pos: source.indexOf(target),
          })),
        );
      });
    });
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
      await tester
        .expect(
          `
        model Fields { ${inside} value: string; }
        @get op read(): { ...Fields; ${outside} };
      `,
        )
        .toBeValid();
    });

    it("accepts the direct named response", async () => {
      await tester
        .expect(
          `
        model Fields { ${inside} ${outside} value: string; }
        @get op read(): Fields;
      `,
        )
        .toBeValid();
    });

    describe.each([false, true])("shared imported response; added payload: %s", (addPayload) => {
      const source = `using TypeSpec.Http;
namespace Models;
model Fields { ${inside} value: string; }
alias Result = { ...Fields; ${outside} ${addPayload ? "extra: string;" : ""} };`;

      beforeEach(async () => {
        const runner = await Tester.import("./responses.tsp")
          .files({ "responses.tsp": source })
          .createInstance();
        tester = createLinterRuleTester(
          runner,
          noUnnamedResponseBodiesRule,
          "@azure-tools/typespec-azure-core",
        );
      });

      it("checks one shared imported response at its original declaration", async () => {
        const expectation = tester.expect(`
          @service namespace Service {
            @get @route("/first") op first(): Models.Result;
            @get @route("/second") op second(): Models.Result;
          }
        `);
        if (addPayload) {
          await expectation.toEmitDiagnostics({
            ...diagnostic,
            file: /responses\.tsp$/,
            pos: source.indexOf("{ ...Fields;"),
          });
        } else {
          await expectation.toBeValid();
        }
      });
    });
  });

  it("reports one shared source declaration across operations", async () => {
    await tester
      .expect(
        `
      alias Result = { value: string };
      @get @route("/first") op first(): Result;
      @get @route("/second") op second(): Result;
    `,
      )
      .toEmitDiagnostics(diagnostic);
  });

  describe("imported project declaration", () => {
    beforeEach(async () => {
      const runner = await Tester.import("./models.tsp")
        .files({ "models.tsp": "namespace Models; alias Result = { value: string };" })
        .createInstance();
      tester = createLinterRuleTester(
        runner,
        noUnnamedResponseBodiesRule,
        "@azure-tools/typespec-azure-core",
      );
    });

    it("targets a shared anonymous declaration in an imported project file once", async () => {
      await tester
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

  describe("imported library declaration", () => {
    beforeEach(async () => {
      const runner = await Tester.files({
        "node_modules/anonymous-responses/package.json": JSON.stringify({
          exports: { ".": { typespec: "./main.tsp" } },
        }),
        "node_modules/anonymous-responses/main.tsp": `
          using TypeSpec.Http;
          namespace ResponseLibrary;
          @get @route("/library") op read(): { value: string };
        `,
      })
        .import("anonymous-responses")
        .createInstance();
      tester = createLinterRuleTester(
        runner,
        noUnnamedResponseBodiesRule,
        "@azure-tools/typespec-azure-core",
      );
    });

    it("excludes a violating library operation while reporting a project operation", async () => {
      await tester
        .expect(
          `
        @service namespace Service;
        @get @route("/project") op read(): /*target*/{ value: string };
      `,
        )
        .toEmitDiagnostics((x) => ({
          ...diagnostic,
          pos: x.pos.target.pos,
        }));
    });
  });

  describe("fixture conversion", () => {
    it("reports one original response across operations and status codes", async () => {
      await tester
        .expect(
          `
        alias Result = /*target*/{
          @statusCode status: 200 | 201;
          @header etag: string;
          value: string;
        };
        @get @route("/first") op first(): Result;
        @get @route("/second") op second(): Result;
      `,
        )
        .toEmitDiagnostics((x) => ({ ...diagnostic, pos: x.pos.target.pos }));
    });

    it("accepts a named widget response", async () => {
      await tester
        .expect(
          `
        model Widget { id: string; widgetName: string; }
        @get @route("/widgets/{name}") op getWidget(@path name: string): Widget;
      `,
        )
        .toBeValid();
    });

    it("reports an implicit widget response", async () => {
      await tester
        .expect(
          `
        @get @route("/widgets") op read(): /*target*/{ value: string };
      `,
        )
        .toEmitDiagnostics((x) => ({ ...diagnostic, pos: x.pos.target.pos }));
    });

    it("reports an implicit response with status and header metadata", async () => {
      await tester
        .expect(
          `
        @get @route("/widgets") op read(): /*target*/{
          @statusCode status: 200;
          @header etag: string;
          value: string;
        };
      `,
        )
        .toEmitDiagnostics((x) => ({ ...diagnostic, pos: x.pos.target.pos }));
    });

    it("reports an anonymous intersection response", async () => {
      await tester
        .expect(
          `
        @get @route("/widgets") op read(): { first: string } & { second: string };
      `,
        )
        .toEmitDiagnostics(diagnostic);
    });

    it("accepts a complete named payload spread", async () => {
      await tester
        .expect(
          `
        model Fields { value: string; }
        @get @route("/widgets") op read(): { ...Fields };
      `,
        )
        .toBeValid();
    });

    it("accepts a complete named spread containing header and status metadata", async () => {
      await tester
        .expect(
          `
        model Fields { @header etag: string; @statusCode status: 200; value: string; }
        @get @route("/widgets") op read(): { ...Fields };
      `,
        )
        .toBeValid();
    });

    it("accepts metadata split between a named model and its complete spread", async () => {
      await tester
        .expect(
          `
        model HeaderFields { @header etag: string; value: string; }
        model StatusFields { @statusCode status: 200; value: string; }
        @get @route("/header-widgets")
        op readHeader(): { ...HeaderFields; @statusCode status: 200; };
        @get @route("/status-widgets")
        op readStatus(): { ...StatusFields; @header etag: string; };
      `,
        )
        .toBeValid();
    });
  });
});
