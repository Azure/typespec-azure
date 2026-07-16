import { Tester } from "#test/test-host.js";
import { createLinterRuleTester, LinterRuleTester } from "@typespec/compiler/testing";
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
        @service
        namespace TestService;
        model Cat { meow: string; }
        model Dog { bark: string; }
        op foo(param: Cat | Dog): void;
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
        @service
        namespace TestService;
        union MyUnion { a: "a", b: "b", c: string }
        op foo(param: MyUnion): void;
        `,
      )
      .toBeValid();
  });

  it("ok when union is just | null (nullable)", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService;
        model Status { name: string; }
        op foo(param: Status | null): void;
        `,
      )
      .toBeValid();
  });

  it("ok for status code union", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService;
        op test(): {
          @statusCode _: 200 | 400 | 500;
        };
        `,
      )
      .toBeValid();
  });

  it("ok for content type union", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService;
        op test(): {
          @header contentType: "application/json" | "text/plain";
          @body _: string;
        };
        `,
      )
      .toBeValid();
  });

  it("flags extensible enum union expression", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService;
        model Request {
          approvalStatus: "Approved" | "Rejected" | string;
        }
        op foo(param: Request): void;
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/no-unnamed-types",
        message: `Anonymous union should be defined as a named union declaration.`,
      });
  });

  it("does not flag status-code response envelope union", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService;

        model Widget {
          id: string;
        }

        op foo(): {@statusCode _: 200; @body body: Widget} | {@statusCode _: 204};
        `,
      )
      .toBeValid();
  });

  it("ok for all-scalar union (e.g. string | int32)", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService;
        model Request {
          value: string | int32;
        }
        op foo(param: Request): void;
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

  it("does not flag anonymous types from standard library operations", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService;
        model Widget { id: string; }
        op foo(): Widget;
        `,
      )
      .toBeValid();
  });
});
