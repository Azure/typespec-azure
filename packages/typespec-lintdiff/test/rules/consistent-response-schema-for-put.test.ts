import {
  $minItems,
  getSourceLocation,
  resolvePath,
  type DecoratorContext,
  type Model,
} from "@typespec/compiler";
import {
  createLinterRuleTester,
  createTester,
  expectDiagnostics,
  mockFile,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { consistentResponseSchemaForPutRule } from "../../src/rules/consistent-response-schema-for-put.js";

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/openapi",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
    "@azure-tools/typespec-autorest",
  ],
})
  .importLibraries()
  .using("TypeSpec.Http", "Azure.ResourceManager")
  .files({
    "decorators.js": mockFile.js({
      $decorators: {
        Custom: {
          indexer: function indexerDecorator(context: DecoratorContext, target: Model) {
            $minItems(context, target, 1);
          },
        },
      },
    }),
  })
  .import("./decorators.js")
  .wrap(
    (code) => `
      namespace Custom {
        extern dec indexer(target: TypeSpec.Reflection.Model);
      }
      @service
      @armProviderNamespace
      namespace Microsoft.TestService {
        model OkBody<T> {
          @statusCode statusCode: 200;
          @body body: T;
        }
        model CreatedBody<T> {
          @statusCode statusCode: 201;
          @body body: T;
        }
        ${code}
      }
    `,
  );

const diagnostic = {
  code: "tsp-lintdiff-local-linter/consistent-response-schema-for-put",
  severity: "warning" as const,
  message:
    "200 response schema does not match 201 response schema. A PUT API must always return the same response schema for both the 200 and 201 status codes.",
};

let tester: LinterRuleTester;
beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    consistentResponseSchemaForPutRule,
    "tsp-lintdiff-local-linter",
  );
});

describe("operation templates", () => {
  it("reports only the differing concrete alias, not its instantiated source", async () => {
    await tester
      .expect(
        `
        @put op Template<T>(): OkBody<string> | CreatedBody<T>;
        @route("/same") op same is Template<string>;
        @route("/different") op /*different*/different is Template<int32>;
      `,
      )
      .toEmitDiagnostics(({ different }) => ({
        ...diagnostic,
        pos: getSourceLocation(different).pos,
        end: getSourceLocation(different).end,
      }));
  });

  it("ignores unused operation and interface template declarations", async () => {
    await tester
      .expect(
        `
        @put op Template<T>(): OkBody<string> | CreatedBody<int32>;
        interface Templates<T> {
          @put put(): OkBody<string> | CreatedBody<int32>;
        }
      `,
      )
      .toBeValid();
  });

  it("checks concrete interface aliases of operation templates", async () => {
    await tester
      .expect(
        `
        @put op Template<T>(): OkBody<string> | CreatedBody<T>;
        interface Widgets {
          @route("/same") same is Template<string>;
          @route("/different") /*different*/different is Template<int32>;
        }
      `,
      )
      .toEmitDiagnostics(({ different }) => ({
        ...diagnostic,
        pos: getSourceLocation(different).pos,
        end: getSourceLocation(different).end,
      }));
  });

  it("checks inherited operations on concrete interfaces, not template interface sources", async () => {
    await tester
      .expect(
        `
        interface Templates<T> {
          @put put(): OkBody<string> | CreatedBody<T>;
        }
        @route("/same") interface Same extends Templates<string> {}
        @route("/different") interface Different extends Templates<int32> {}
      `,
      )
      .toEmitDiagnostics(diagnostic);
  });

  it("reports each concrete alias of a shared violating template instance", async () => {
    await tester
      .expect(
        `
        @put op Template<T>(): OkBody<string> | CreatedBody<T>;
        @route("/first") op first is Template<int32>;
        @route("/second") op second is Template<int32>;
      `,
      )
      .toEmitDiagnostics([diagnostic, diagnostic]);
  });

  it("checks aliases of operations on instantiated interfaces", async () => {
    await tester
      .expect(
        `
        interface Templates<T> {
          @put put(): OkBody<string> | CreatedBody<T>;
        }
        alias Same = Templates<string>;
        alias Different = Templates<int32>;
        @route("/same") op same is Same.put;
        @route("/different") op /*different*/different is Different.put;
      `,
      )
      .toEmitDiagnostics(({ different }) => ({
        ...diagnostic,
        pos: getSourceLocation(different).pos,
        end: getSourceLocation(different).end,
      }));
  });
});

describe("constant array schemas", () => {
  it.each(["unknown[]", "Array<unknown>"])("normalizes a tuple and %s", async (array) => {
    await tester
      .expect(
        `
        @put op put(): OkBody<[string]> | CreatedBody<${array}>;
      `,
      )
      .toBeValid();
  });

  it("normalizes unknown[] when it is the 200 body", async () => {
    await tester
      .expect(
        `
        @put op put(): OkBody<unknown[]> | CreatedBody<[int32, boolean]>;
      `,
      )
      .toBeValid();
  });

  it.each([
    ["named", "model Items is Array<unknown>;", "Items"],
    ["constrained", "@minItems(1) model Items<T> is Array<unknown>;", "Items<unknown>"],
    ["friendly named", '@friendlyName("Items") model Items<T> is Array<T>;', "Items<unknown>"],
    ["custom decorated", "@Custom.indexer model Items<T> is Array<T>;", "Items<unknown>"],
    ["typed", "", "string[]"],
  ])("does not normalize %s arrays", async (_, declaration, array) => {
    await tester
      .expect(
        `
        ${declaration}
        @put op put(): OkBody<[string]> | CreatedBody<${array}>;
      `,
      )
      .toEmitDiagnostics(diagnostic);
  });

  it("preserves equality for the same constrained array type", async () => {
    await tester
      .expect(
        `
        @minItems(1) model Items<T> is Array<unknown>;
        @put op put(): OkBody<Items<unknown>> | CreatedBody<Items<unknown>>;
      `,
      )
      .toBeValid();
  });
});

describe("response content variants", () => {
  const responses = `
      model Response<Status extends int32, Body, ContentType extends string> {
        @statusCode statusCode: Status;
        @header contentType: ContentType;
        @body body: Body;
      }
    `;

  it.each([
    [200, 201],
    [201, 200],
  ])(
    "ignores conflicting body types at status %s regardless of their order",
    async (status, otherStatus) => {
      for (const bodies of ["Json | Xml", "Xml | Json"]) {
        const code = `
            ${responses}
            model Json is Response<${status}, string, "application/json">;
            model Xml is Response<${status}, int32, "application/xml">;
            model Other is Response<${otherStatus}, string, "application/json">;
            @put op put(): ${bodies} | Other;
          `;
        await tester.expect(code).toBeValid();
        const diagnostics = await Tester.emit("@azure-tools/typespec-autorest").diagnose(code);
        expectDiagnostics(
          diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
          { code: "@azure-tools/typespec-autorest/duplicate-body-types" },
        );
      }
    },
  );

  it("does not merge distinct inline types merely because their properties agree", async () => {
    await tester
      .expect(
        `
          ${responses}
          model Json is Response<200, { value: string }, "application/json">;
          model Xml is Response<200, { value: string }, "application/xml">;
          @put op put(): Json | Xml | CreatedBody<int32>;
        `,
      )
      .toBeValid();
  });

  it.each(["Json | Xml", "Xml | Json"])(
    "allows shared body types across reordered variants: %s",
    async (variants) => {
      await tester
        .expect(
          `
            ${responses}
            model Payload { value: string; }
            model Json is Response<200, Payload, "application/json">;
            model Xml is Response<200, Payload, "application/xml">;
            @put op put(): ${variants} | CreatedBody<Payload>;
          `,
        )
        .toBeValid();
    },
  );

  it.each(["Json | Xml", "Xml | Json"])(
    "still reports different schemas across valid status groups: %s",
    async (variants) => {
      await tester
        .expect(
          `
            ${responses}
            model Payload { value: string; }
            model Other { value: int32; }
            model Json is Response<200, Payload, "application/json">;
            model Xml is Response<200, Payload, "application/xml">;
            @put op /*put*/put(): ${variants} | CreatedBody<Other>;
          `,
        )
        .toEmitDiagnostics(({ put }) => ({
          ...diagnostic,
          pos: getSourceLocation(put).pos,
          end: getSourceLocation(put).end,
        }));
    },
  );

  it.each(["Json | Binary", "Binary | Json"])(
    "aggregates every content type for a shared bytes body: %s",
    async (variants) => {
      await tester
        .expect(
          `
            ${responses}
            model Json is Response<200, bytes, "application/json">;
            model Binary is Response<200, bytes, "application/octet-stream">;
            model Created is Response<201, bytes, "application/octet-stream">;
            @put op put(): ${variants} | Created;
          `,
        )
        .toEmitDiagnostics(diagnostic);
    },
  );

  it.each(["Empty | OkBody<string>", "OkBody<string> | Empty"])(
    "does not treat a bodyless variant as a conflicting body: %s",
    async (variants) => {
      await tester
        .expect(
          `
            model Empty { @statusCode statusCode: 200; }
            @put op put(): ${variants} | CreatedBody<int32>;
          `,
        )
        .toEmitDiagnostics(diagnostic);
    },
  );
});
