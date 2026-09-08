import { Tester } from "#test/tester.js";
import {
  createLinterRuleTester,
  type LinterRuleTester,
  type TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { useApplicationJsonContentTypeRule } from "../../src/rules/use-application-json-content-type.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    useApplicationJsonContentTypeRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("accepts ARM operations with only application/json content types", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model SyncRequest {
        value: string;
      }

      @post
      op sync(
        @header contentType: "application/json",
        @body body: SyncRequest,
      ): {
        @statusCode statusCode: 200;
        @body result: SyncRequest;
      };
      `,
    )
    .toBeValid();
});

it("reports an explicit non-JSON response content type", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      @get
      op download(): {
        @statusCode statusCode: 200;
        @header contentType: "application/octet-stream";
        @body content: bytes;
      };
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/use-application-json-content-type",
      message: "Only content-type 'application/json' is supported by ARM.",
    });
});

it("reports an implicit scalar response content type", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      @post
      op generateToken(): ArmResponse<string>;
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/use-application-json-content-type",
      message: "Only content-type 'application/json' is supported by ARM.",
    });
});

it("reports an explicit non-JSON request content type", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model ExportRequest {
        format: string;
      }

      @post
      op export(
        @header contentType: "text/plain",
        @body body: ExportRequest,
      ): void;
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/use-application-json-content-type",
      message: "Only content-type 'application/json' is supported by ARM.",
    });
});

it("reports application/merge-patch+json request content type", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model WidgetPatch {
        description?: string;
      }

      @patch
      op update(
        @header contentType: "application/merge-patch+json",
        @body body: WidgetPatch,
      ): void;
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/use-application-json-content-type",
      message: "Only content-type 'application/json' is supported by ARM.",
    });
});
