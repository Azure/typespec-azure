import { Tester } from "#test/test-host.js";
import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noOpenapiClientExtensionsRule } from "../../src/rules/no-openapi-client-extensions.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.import("@typespec/openapi").createInstance();
  tester = createLinterRuleTester(
    runner,
    noOpenapiClientExtensionsRule,
    "@azure-tools/typespec-azure-core",
  );
});

describe("client-altering extensions", () => {
  it("emits a diagnostic for x-ms-long-running-operation on an operation", async () => {
    await tester
      .expect(
        `
        @OpenAPI.extension("x-ms-long-running-operation", true)
        op test(): string;
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/no-openapi-client-extensions",
        severity: "warning",
        message: `Do not use the @typespec/openapi @extension decorator to emit the client-altering "x-ms-long-running-operation" extension. It only affects the OpenAPI output, so client SDKs and other emitters will produce an incorrect representation of the API. Use the corresponding TypeSpec construct instead.`,
      });
  });

  it("emits a diagnostic for x-ms-enum on an enum", async () => {
    await tester
      .expect(
        `
        @OpenAPI.extension("x-ms-enum", #{ name: "PetKind", modelAsString: true })
        enum PetKind {
          Cat,
          Dog,
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/no-openapi-client-extensions",
      });
  });

  it("emits a diagnostic for x-ms-client-flatten on a model property", async () => {
    await tester
      .expect(
        `
        model Widget {
          @OpenAPI.extension("x-ms-client-flatten", true)
          properties: WidgetProperties;
        }
        model WidgetProperties {
          name: string;
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/no-openapi-client-extensions",
      });
  });

  it("emits a diagnostic for x-ms-client-name on a model property", async () => {
    await tester
      .expect(
        `
        model Widget {
          @OpenAPI.extension("x-ms-client-name", "widgetName")
          name: string;
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/no-openapi-client-extensions",
      });
  });

  it("emits a diagnostic for x-ms-parameter-location on a model property", async () => {
    await tester
      .expect(
        `
        model Params {
          @OpenAPI.extension("x-ms-parameter-location", "client")
          subscriptionId: string;
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/no-openapi-client-extensions",
      });
  });

  it("emits a diagnostic for x-nullable on a model property", async () => {
    await tester
      .expect(
        `
        model Widget {
          @OpenAPI.extension("x-nullable", true)
          name: string;
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/no-openapi-client-extensions",
      });
  });

  it("emits a diagnostic for x-ms-secret on a model property", async () => {
    await tester
      .expect(
        `
        model Widget {
          @OpenAPI.extension("x-ms-secret", true)
          key: string;
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/no-openapi-client-extensions",
      });
  });

  it("emits a diagnostic for x-ms-azure-resource on a model", async () => {
    await tester
      .expect(
        `
        @OpenAPI.extension("x-ms-azure-resource", true)
        model Widget {
          name: string;
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/no-openapi-client-extensions",
      });
  });
});

describe("allowed extensions", () => {
  it("is valid for a non-client-altering custom extension", async () => {
    await tester
      .expect(
        `
        @OpenAPI.extension("x-ms-examples", #{ foo: "bar" })
        op test(): string;
        `,
      )
      .toBeValid();
  });

  it("is valid for an arbitrary x- extension", async () => {
    await tester
      .expect(
        `
        @OpenAPI.extension("x-custom-value", "hello")
        model Widget {
          name: string;
        }
        `,
      )
      .toBeValid();
  });

  it("is valid for x-ms-identifiers which has its own dedicated rule", async () => {
    await tester
      .expect(
        `
        model Widget {
          @OpenAPI.extension("x-ms-identifiers", #["id"])
          items: Item[];
        }
        model Item {
          id: string;
        }
        `,
      )
      .toBeValid();
  });
});

describe("scope", () => {
  it("is valid when no OpenAPI extension is used", async () => {
    await tester
      .expect(
        `
        model Widget {
          name: string;
        }
        `,
      )
      .toBeValid();
  });
});
