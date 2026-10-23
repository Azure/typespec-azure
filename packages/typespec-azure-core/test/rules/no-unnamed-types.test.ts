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
    "@get op read(): /*target*/{ value: string };",
    "@get op read(): /*target*/{ @statusCode status: 200; value: string };",
    "@get op read(): /*target*/{ @header etag: string; value: string };",
    "@get op read(): /*target*/{ @statusCode status: 200; @header etag: string; value: string };",
    "@get op read(): /*target*/{ first: string } & { second: string };",
    "model First { first: string; } model Second { second: string; } @get op read(): /*target*/First & Second;",
    "model Fields { value: string; } @get op read(): /*target*/{ ...Fields; extra: string };",
    "alias Result = /*target*/{ value: string }; @get op read(): Result;",
    "model Node { next?: Node; } @get op read(): /*target*/{ first: Node; second: Node };",
  ])("reports implicit anonymous response: %s", async (code) => {
    await tester.expect(code).toEmitDiagnostics((x) => ({ ...diagnostic, pos: x.pos.target.pos }));
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

  it("reports an anonymous response inherited from a concrete interface template", async () => {
    await tester
      .expect(
        `
        interface Templates<T> {
          @get @route("/widgets") read(): /*target*/{ value: T };
        }
        interface Widgets extends Templates<string> {}
        `,
      )
      .toEmitDiagnostics((x) => ({ ...diagnostic, pos: x.pos.target.pos }));
  });

  it("accepts a named response inherited from a concrete interface template", async () => {
    await tester
      .expect(
        `
        model Result<T> { value: T; }
        interface Templates<T> {
          @get @route("/widgets") read(): Result<T>;
        }
        interface Widgets extends Templates<string> {}
        `,
      )
      .toBeValid();
  });

  it.each([
    '@get @route("/widgets") op read<T>(): { value: T };',
    'interface Templates<T> { @get @route("/widgets") read(): { value: T }; }',
  ])("does not check uninstantiated response templates: %s", async (code) => {
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
    const first = "/*first*/{ first: string }";
    const second = "/*second*/{ second: int32 }";
    const json =
      '/*json*/{ @statusCode status: 200; @header contentType: "application/json"; first: string }';
    const xml =
      '/*xml*/{ @statusCode status: 200; @header contentType: "application/xml"; second: int32 }';
    const named =
      'model Named { @statusCode status: 200; @header contentType: "application/json"; first: string; }';
    const spread = "{ ...Named }";

    describe.each([
      {
        name: "plain union",
        declarations: "",
        result: `${first} | ${second}`,
        targets: ["first", "second"],
      },
      {
        name: "plain union reversed",
        declarations: "",
        result: `${second} | ${first}`,
        targets: ["second", "first"],
      },
      { name: "named first", declarations: named, result: `Named | ${xml}`, targets: ["xml"] },
      { name: "named last", declarations: named, result: `${xml} | Named`, targets: ["xml"] },
      {
        name: "two envelopes",
        declarations: "",
        result: `${json} | ${xml}`,
        targets: ["json", "xml"],
      },
      {
        name: "two envelopes reversed",
        declarations: "",
        result: `${xml} | ${json}`,
        targets: ["xml", "json"],
      },
      { name: "spread first", declarations: named, result: `${spread} | ${xml}`, targets: ["xml"] },
      { name: "spread last", declarations: named, result: `${xml} | ${spread}`, targets: ["xml"] },
      {
        name: "explicit body first",
        declarations: "",
        result: `{ @header contentType: "application/json"; @body body: ${first} } | ${xml}`,
        targets: ["xml", "first"],
      },
      {
        name: "explicit body last",
        declarations: "",
        result: `${xml} | { @header contentType: "application/json"; @bodyRoot body: ${first} }`,
        targets: ["xml", "first"],
      },
      {
        name: "nested shared unions",
        declarations: `alias First = ${first}; union Inner { First, ${second} } union Outer { Inner, First, string, null }`,
        result: "Outer",
        targets: ["first", "second"],
      },
      {
        name: "shared envelope alias",
        declarations: `alias Shared = ${xml}; union Inner { Shared, Named }`,
        result: "Inner | Shared",
        targets: ["xml"],
        prefix: named,
      },
      {
        name: "non-model alternatives",
        declarations: "",
        result: `${first} | string | string[] | Record<string> | null`,
        targets: ["first"],
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
        const runner = await Tester.import("./responses.tsp").createInstance();
        tester = createLinterRuleTester(
          runner,
          noUnnamedTypesRule,
          "@azure-tools/typespec-azure-core",
        );
      });

      it("targets each original declaration once across operations", async () => {
        await tester.expect({ "main.tsp": "", "responses.tsp": source }).toEmitDiagnostics((x) =>
          targets.map((target) => ({
            ...diagnostic,
            file: /responses\.tsp$/,
            pos: x.pos[target].pos,
          })),
        );
      });
    });
  });

  it.each([
    ["direct named response", "Fields"],
    ["complete spread", "{ ...Fields }"],
  ])("accepts header and status metadata in a %s", async (_, response) => {
    await tester
      .expect(
        `
        model Fields { @header etag: string; @statusCode status: 200; value: string; }
        @get op read(): ${response};
        `,
      )
      .toBeValid();
  });

  it.each([
    ["@header etag: string;", "@statusCode status: 200;"],
    ["@statusCode status: 200;", "@header etag: string;"],
  ])("accepts split metadata inside %s and outside %s", async (inside, outside) => {
    await tester
      .expect(
        `
        model Fields { ${inside} value: string; }
        @get op read(): { ...Fields; ${outside} };
        `,
      )
      .toBeValid();
  });

  describe("imported response provenance", () => {
    beforeEach(async () => {
      const runner = await Tester.import("./responses.tsp").createInstance();
      tester = createLinterRuleTester(
        runner,
        noUnnamedTypesRule,
        "@azure-tools/typespec-azure-core",
      );
    });

    it.each([false, true])(
      "checks shared imported spread; added payload: %s",
      async (addPayload) => {
        const expectation = tester.expect({
          "main.tsp": `
          @service namespace Service {
            @get @route("/first") op first(): Models.Result;
            @get @route("/second") op second(): Models.Result;
          }
        `,
          "responses.tsp": `
          using TypeSpec.Http;
          namespace Models;
          model Fields { @header etag: string; value: string; }
          alias Result = /*target*/{
            ...Fields;
            @statusCode status: 200;
            ${addPayload ? "extra: string;" : ""}
          };
        `,
        });
        if (addPayload) {
          await expectation.toEmitDiagnostics((x) => ({
            ...diagnostic,
            file: /responses\.tsp$/,
            pos: x.pos.target.pos,
          }));
        } else {
          await expectation.toBeValid();
        }
      },
    );
  });

  it("targets a shared anonymous declaration in an imported project file once", async () => {
    const runner = await Tester.import("./models.tsp").createInstance();
    const importedTester = createLinterRuleTester(
      runner,
      noUnnamedTypesRule,
      "@azure-tools/typespec-azure-core",
    );
    await importedTester
      .expect({
        "main.tsp": `
          @service namespace Service {
            @get @route("/first") op first(): Models.Result;
            @get @route("/second") op second(): Models.Result;
          }
        `,
        "models.tsp": "namespace Models; alias Result = /*target*/{ value: string };",
      })
      .toEmitDiagnostics((x) => ({
        ...diagnostic,
        file: /models\.tsp$/,
        pos: x.pos.target.pos,
      }));
  });

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
