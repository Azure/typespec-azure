import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { noQueryParametersInPostRule } from "../../src/rules/no-query-parameters-in-post.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noQueryParametersInPostRule,
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

      @armResourceOperations
      interface Widgets {
        @post
        @armResourceAction(Widget)
        doAction(
          ...ResourceInstanceParameters<Widget>,
          @query mode?: string,
          @body body: ActionRequest,
        ): ArmResponse<ActionResponse> | ErrorResponse;
      }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/no-query-parameters-in-post",
      message:
        "Query parameter 'mode' should be moved into the POST payload. POST operations must not contain query parameters other than api-version.",
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

      @armResourceOperations
      interface Widgets {
        @post
        @armResourceAction(Widget)
        doAction(
          ...ResourceInstanceParameters<Widget>,
          @query mode?: string,
          @query format?: string,
          @body body: ActionRequest,
        ): ArmResponse<ActionResponse> | ErrorResponse;
      }
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/no-query-parameters-in-post",
        message:
          "Query parameter 'mode' should be moved into the POST payload. POST operations must not contain query parameters other than api-version.",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/no-query-parameters-in-post",
        message:
          "Query parameter 'format' should be moved into the POST payload. POST operations must not contain query parameters other than api-version.",
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
      code: "@azure-tools/typespec-azure-resource-manager/no-query-parameters-in-post",
      message:
        "Query parameter '$filter' should be moved into the POST payload. POST operations must not contain query parameters other than api-version.",
    });
});

it("does not emit a warning for an ARM POST operation with only api-version in query", async () => {
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

      @armResourceOperations
      interface Widgets {
        @post
        @armResourceAction(Widget)
        doAction(
          ...ResourceInstanceParameters<Widget>,
          @body body: ActionRequest,
        ): ArmResponse<ActionResponse> | ErrorResponse;
      }
      `,
    )
    .toBeValid();
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
      code: "@azure-tools/typespec-azure-resource-manager/no-query-parameters-in-post",
      message:
        "Query parameter 'API-Version' should be moved into the POST payload. POST operations must not contain query parameters other than api-version.",
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
