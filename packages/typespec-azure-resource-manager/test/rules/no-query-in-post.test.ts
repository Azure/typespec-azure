import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { noQueryInPostRule } from "../../src/rules/no-query-in-post.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noQueryInPostRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("emits a warning for an ARM POST resource action with an extra query parameter", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Widget is TrackedResource<{}> {
        ...ResourceNameParameter<Widget>;
      }

      model ActionRequest {
        value: string;
      }

      model ActionResponse {
        result: string;
      }

      model ActionParameters {
        @query mode?: string;
      }

      @armResourceOperations
      interface Widgets {
        doAction is ArmResourceActionSync<
          Widget,
          ActionRequest,
          ActionResponse,
          Parameters = ActionParameters
        >;
      }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/no-query-in-post",
      message:
        "Query parameter 'mode' should be moved into the POST request body. POST operations must not contain query parameters other than api-version.",
    });
});

it("emits a warning for each extra query parameter on an ARM POST operation", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Widget is TrackedResource<{}> {
        ...ResourceNameParameter<Widget>;
      }

      model ActionRequest {
        value: string;
      }

      model ActionResponse {
        result: string;
      }

      model ActionParameters {
        @query mode?: string;
        @query format?: string;
      }

      @armResourceOperations
      interface Widgets {
        doAction is ArmResourceActionSync<
          Widget,
          ActionRequest,
          ActionResponse,
          Parameters = ActionParameters
        >;
      }
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/no-query-in-post",
        message:
          "Query parameter 'mode' should be moved into the POST request body. POST operations must not contain query parameters other than api-version.",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/no-query-in-post",
        message:
          "Query parameter 'format' should be moved into the POST request body. POST operations must not contain query parameters other than api-version.",
      },
    ]);
});

it("emits a warning for a non-resource ARM POST operation with an extra query parameter", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model SearchResponse {
        values: string[];
      }

      interface Searches {
        @route("/providers/Microsoft.Contoso/search")
        @post
        search(
          ...ApiVersionParameter,
          @query("$filter") filter?: string,
        ): ArmResponse<SearchResponse> | ErrorResponse;
      }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/no-query-in-post",
      message:
        "Query parameter '$filter' should be moved into the POST request body. POST operations must not contain query parameters other than api-version.",
    });
});

it("emits a warning when the api-version query parameter uses different casing", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model SearchResponse {
        values: string[];
      }

      interface Searches {
        @route("/providers/Microsoft.Contoso/search")
        @post
        search(
          @query("API-Version") apiVersion: string,
        ): ArmResponse<SearchResponse> | ErrorResponse;
      }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/no-query-in-post",
      message:
        "Query parameter 'API-Version' should be moved into the POST request body. POST operations must not contain query parameters other than api-version.",
    });
});

it("does not emit a warning for non-ARM POST operations", async () => {
  await tester
    .expect(
      `
      namespace Contoso;

      model ActionRequest {
        value: string;
      }

      model ActionResponse {
        result: string;
      }

      @route("/widgets")
      @post
      op doAction(
        @query mode?: string,
        @body body: ActionRequest,
      ): ActionResponse;
      `,
    )
    .toBeValid();
});
