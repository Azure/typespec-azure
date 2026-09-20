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

    it("does not report anonymous bodies declared in an external library", async () => {
      const importedTester = createLinterRuleTester(
        await Tester.import("models").createInstance(),
        noUnnamedTypesRule,
        "@azure-tools/typespec-azure-core",
      );
      await importedTester
        .expect({
          "node_modules/models/package.json": JSON.stringify({
            exports: { ".": { typespec: "./main.tsp" } },
          }),
          "node_modules/models/main.tsp": `
            namespace Imported;
            model Envelope<T> { @TypeSpec.Http.body body: T; }
            alias Request = Envelope<{ name: string; }>;
          `,
          "main.tsp": `
            @service namespace TestService;
            @post op send(...Imported.Request): void;
          `,
        })
        .toBeValid();
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
