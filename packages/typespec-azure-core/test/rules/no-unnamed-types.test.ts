import { Tester } from "#test/test-host.js";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noUnnamedTypesRule } from "../../src/rules/no-unnamed-types.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(runner, noUnnamedTypesRule, "@azure-tools/typespec-azure-core");
});

describe("unions", () => {
  it("emits diagnostic when using union expression", async () => {
    await tester
      .expect(
        `
        model Request {
          approvalStatus: "Approved" | "Rejected" | string;
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/no-unnamed-types",
        message: `Anonymous union should be defined as a named union declaration.`,
      });
  });

  it("ok when using union declaration", async () => {
    await tester
      .expect(
        `
        model Request {
          approvalStatus: RequestApprovalStatus;
        }

        union RequestApprovalStatus {
          Approved: "Approved",
          Rejected: "Rejected",
          string,
        }
        `,
      )
      .toBeValid();
  });

  it("ok when union is just | null", async () => {
    await tester
      .expect(
        `
        model Status { }
        model Request {
          approvalStatus: Status | null;
        }
        `,
      )
      .toBeValid();
  });

  it("ok for status code", async () => {
    await tester
      .expect(
        `
        op test(): {
          @statusCode _: 200 | 400 | 500;
        };
        `,
      )
      .toBeValid();
  });

  it("ok for content type", async () => {
    await tester
      .expect(
        `
        op test(): {
          @header contentType: "application/json" | "text/plain";
          @body _: string;
        };
        `,
      )
      .toBeValid();
  });

  it("ok for operation return type union (response envelope)", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService;

        model Widget { id: string; }

        op foo(): {@statusCode _: 200; @body body: Widget} | {@statusCode _: 204};
        `,
      )
      .toBeValid();
  });
});

describe("response bodies", () => {
  let tester: LinterRuleTester;

  beforeEach(async () => {
    const runner = await Tester.wrap(
      (code) => `@service namespace Service { ${code} }`,
    ).createInstance();
    tester = createLinterRuleTester(runner, noUnnamedTypesRule, "@azure-tools/typespec-azure-core");
  });

  const diagnostic = {
    code: "@azure-tools/typespec-azure-core/no-unnamed-types",
    message: "Anonymous model should be defined as a named model declaration.",
  };

  it.each([
    "@get op read(): { value: string };",
    "@get op read(): { @statusCode status: 200; value: string };",
    "@get op read(): { @header etag: string; value: string };",
    "@get op read(): { first: string } & { second: string };",
    "model First { first: string; } model Second { second: string; } @get op read(): First & Second;",
    "model Fields { value: string; } @get op read(): { ...Fields; extra: string };",
    "alias Result = { value: string }; @get op read(): Result;",
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
    "@get op read(): { @statusCode status: 204 };",
    "@get op read(): {};",
    "@get op read(): void;",
    "@get op read(): string;",
    "@get op read(): string[];",
    "@get op read(): Record<string>;",
    "model Result { values: Record<{ value: string }> } @get op read(): Result;",
  ])("accepts named responses and bodies outside the rule's scope: %s", async (code) => {
    await tester.expect(code).toBeValid();
  });

  it.each(["body", "bodyRoot"])("reports an explicit @%s body once", async (decorator) => {
    await tester
      .expect(`@get op read(): { @${decorator} body: /*target*/{ value: string } };`)
      .toEmitDiagnostics((x) => ({ ...diagnostic, pos: x.pos.target.pos }));
  });

  it("reports a shared property, request and response model only once", async () => {
    await tester
      .expect(
        `
        alias Shared = /*target*/{ value: string };
        model Container { nested: Shared; }
        @post @route("/write") op write(@body body: Shared): Shared;
        @get @route("/read") op read(): Shared;
        `,
      )
      .toEmitDiagnostics((x) => ({ ...diagnostic, pos: x.pos.target.pos }));
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
        targets: [xml, first],
      },
      {
        name: "explicit body last",
        declarations: "",
        result: `${xml} | { @header contentType: "application/json"; @bodyRoot body: ${first} }`,
        targets: [xml, first],
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
          noUnnamedTypesRule,
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
          noUnnamedTypesRule,
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
        noUnnamedTypesRule,
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

describe("models", () => {
  it("flags anonymous model in property", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService;
        model Named {
          prop: { foo: string; };
        }
        op foo(param: Named): void;
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/no-unnamed-types",
        message: `Anonymous model should be defined as a named model declaration.`,
      });
  });

  it("flags anonymous model as operation parameter", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService;
        op foo(@body body: { name: string; }): void;
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/no-unnamed-types",
        message: `Anonymous model should be defined as a named model declaration.`,
      });
  });

  it("flags anonymous model in response body", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService;
        op foo(): { @statusCode _: 200; @body body: { id: string; } };
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/no-unnamed-types",
        message: `Anonymous model should be defined as a named model declaration.`,
      });
  });

  it("ok when model is named", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService;
        model MyResponse { id: string; }
        op foo(): MyResponse;
        `,
      )
      .toBeValid();
  });

  it("does not flag HTTP envelope models (status code, headers)", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService;
        model Widget { id: string; }
        op foo(): { @statusCode _: 200; @body body: Widget; };
        `,
      )
      .toBeValid();
  });

  it("flags anonymous models even when not directly used in an operation", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService;
        model Orphan {
          nested: { foo: string; };
        }
        op foo(): void;
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/no-unnamed-types",
        message: `Anonymous model should be defined as a named model declaration.`,
      });
  });

  it("does not flag template arguments that are not request bodies", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService;
        model Template<T> { value: T; }
        model Foo is Template<{ type: string; url: string; }>;
        op foo(): void;
        `,
      )
      .toBeValid();
  });

  describe("template request bodies", () => {
    it.each(["body", "bodyRoot"])("flags an anonymous @%s template argument", async (decorator) => {
      await tester
        .expect(
          `
          @service namespace TestService;
          @post op Send<T>(@${decorator} body: T): void;
          op send is Send</*anonymous*/{ name: string; }>;
          `,
        )
        .toEmitDiagnostics((x) => ({
          code: "@azure-tools/typespec-azure-core/no-unnamed-types",
          message: "Anonymous model should be defined as a named model declaration.",
          pos: x.pos.anonymous.pos,
        }));
    });

    it("flags an anonymous body passed through an interface template", async () => {
      await tester
        .expect(
          `
          @service namespace TestService;
          interface Actions<T> {
            @post send(@body body: T): void;
          }
          interface Widgets extends Actions</*anonymous*/{ name: string; }> {}
          `,
        )
        .toEmitDiagnostics((x) => ({
          code: "@azure-tools/typespec-azure-core/no-unnamed-types",
          message: "Anonymous model should be defined as a named model declaration.",
          pos: x.pos.anonymous.pos,
        }));
    });

    it.each(["First & Second", "{ ...First, ...Second }"])(
      "flags an unnamed composed request body: %s",
      async (body) => {
        await tester
          .expect(
            `
            @service namespace TestService;
            model First { first: string; }
            model Second { second: string; }
            @post op Send<T>(@body body: T): void;
            op send is Send</*anonymous*/${body}>;
            `,
          )
          .toEmitDiagnostics((x) => ({
            code: "@azure-tools/typespec-azure-core/no-unnamed-types",
            message: "Anonymous model should be defined as a named model declaration.",
            pos: x.pos.anonymous.pos,
          }));
      },
    );

    it("does not flag a named composed request body", async () => {
      await tester
        .expect(
          `
          @service namespace TestService;
          model First { first: string; }
          model Second { second: string; }
          model Request { ...First; ...Second; }
          @post op Send<T>(@body body: T): void;
          op send is Send<Request>;
          `,
        )
        .toBeValid();
    });

    it("flags an anonymous body inside a spread request envelope", async () => {
      await tester
        .expect(
          `
          @service namespace TestService;
          model Envelope<T> {
            @header requestId: string;
            @body body: T;
          }
          @post op send(...Envelope</*anonymous*/{ name: string; }>): void;
          `,
        )
        .toEmitDiagnostics((x) => ({
          code: "@azure-tools/typespec-azure-core/no-unnamed-types",
          message: "Anonymous model should be defined as a named model declaration.",
          pos: x.pos.anonymous.pos,
        }));
    });

    it("reports a shared anonymous body once across operations", async () => {
      await tester
        .expect(
          `
          @service namespace TestService;
          model Envelope<T> { @body body: T; }
          alias Request = Envelope</*anonymous*/{ name: string; }>;
          @route("/first") @post op first(...Request): void;
          @route("/second") @post op second(...Request): void;
          `,
        )
        .toEmitDiagnostics((x) => ({
          code: "@azure-tools/typespec-azure-core/no-unnamed-types",
          message: "Anonymous model should be defined as a named model declaration.",
          pos: x.pos.anonymous.pos,
        }));
    });

    it("flags a user argument to an imported operation template", async () => {
      const importedTester = createLinterRuleTester(
        await Tester.import("./templates.tsp").createInstance(),
        noUnnamedTypesRule,
        "@azure-tools/typespec-azure-core",
      );
      await importedTester
        .expect({
          "templates.tsp": `
            namespace Templates;
            @TypeSpec.Http.post op Send<T>(@TypeSpec.Http.body body: T): void;
          `,
          "main.tsp": `
            @service namespace TestService;
            op send is Templates.Send</*anonymous*/{ name: string; }>;
          `,
        })
        .toEmitDiagnostics((x) => ({
          code: "@azure-tools/typespec-azure-core/no-unnamed-types",
          message: "Anonymous model should be defined as a named model declaration.",
          pos: x.pos.anonymous.pos,
        }));
    });

    it.each(["Request", "{}", "Record<string>"])("does not flag %s bodies", async (body) => {
      await tester
        .expect(
          `
          @service namespace TestService;
          model Request { name: string; }
          @post op Send<T>(@body body: T): void;
          op send is Send<${body}>;
          `,
        )
        .toBeValid();
    });

    it("does not flag OAuth2 configuration", async () => {
      await tester
        .expect(
          `
          @service @useAuth(Auth) namespace TestService;
          model Auth is OAuth2Auth<[{
            type: OAuth2FlowType.implicit;
            authorizationUrl: "https://example.com/authorize";
            scopes: ["read"];
          }]>;
          model Request { name: string; }
          @post op send(@body body: Request): void;
          `,
        )
        .toBeValid();
    });

    it("does not flag template parameter options", async () => {
      await tester
        .expect(
          `
          @service namespace TestService;
          model Request { name: string; }
          @post op Send<Options extends {}>(...Options, @body body: Request): void;
          @route("/{name}") op send is Send<{
            @path name: string;
            @query filter?: string;
            @header requestId?: string;
          }>;
          `,
        )
        .toBeValid();
    });

    it("does not flag a multipart template body", async () => {
      await tester
        .expect(
          `
          @service namespace TestService;
          @post op Send<T>(@multipartBody body: T): void;
          op send is Send<{ file: HttpPart<bytes>; }>;
          `,
        )
        .toBeValid();
    });

    it("does not change template response-body exemptions", async () => {
      await tester
        .expect(
          `
          @service namespace TestService;
          model Response<T> { @body body: T; }
          @get op read(): Response<{ name: string; }>;
          `,
        )
        .toBeValid();
    });

    it("does not flag an HTTP envelope passed to bodyRoot", async () => {
      await tester
        .expect(
          `
          @service namespace TestService;
          @post op Send<T>(@bodyRoot body: T): void;
          op send is Send<{ @header requestId: string; name: string; }>;
          `,
        )
        .toBeValid();
    });

    it("does not flag a synthesized request body", async () => {
      await tester
        .expect(
          `
          @service namespace TestService;
          @post op Send<Parameters extends {}>(...Parameters): void;
          op send is Send<{ name: string; }>;
          `,
        )
        .toBeValid();
    });
  });
});
