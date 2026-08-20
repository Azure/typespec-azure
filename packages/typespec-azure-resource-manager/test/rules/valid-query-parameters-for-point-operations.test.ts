import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { validQueryParametersForPointOperationsRule } from "../../src/rules/valid-query-parameters-for-point-operations.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    validQueryParametersForPointOperationsRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const service = `
  @service(#{ title: "Test Service" })
  namespace Microsoft.TestService;

  model ResourceInstanceParameters {
    @path subscriptionId: string;
    @path resourceGroupName: string;
    @path widgetName: string;
    @query("api-version") apiVersion: string;
  }
`;

const pointPath =
  "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}";

it("emits for extra query parameters on top-level GET, PUT, PATCH, and DELETE operations", async () => {
  await tester
    .expect(
      `
        ${service}

        @route("${pointPath}")
        interface Widgets {
          @get get(...ResourceInstanceParameters, @query expand?: string): void;
          @put createOrUpdate(...ResourceInstanceParameters, @query modeHint?: string): void;
          @patch update(...ResourceInstanceParameters, @query patchMode?: string): void;
          @delete delete(...ResourceInstanceParameters, @query deleteMode?: string): void;
        }
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/valid-query-parameters-for-point-operations",
        message:
          "Query parameter 'expand' should be removed. Point operation 'get' MUST not have query parameters other than api-version.",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/valid-query-parameters-for-point-operations",
        message:
          "Query parameter 'modeHint' should be removed. Point operation 'put' MUST not have query parameters other than api-version.",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/valid-query-parameters-for-point-operations",
        message:
          "Query parameter 'patchMode' should be removed. Point operation 'patch' MUST not have query parameters other than api-version.",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/valid-query-parameters-for-point-operations",
        message:
          "Query parameter 'deleteMode' should be removed. Point operation 'delete' MUST not have query parameters other than api-version.",
      },
    ]);
});

it("emits for extra query parameters on nested point GET and PUT operations", async () => {
  await tester
    .expect(
      `
        ${service}

        model NestedResourceInstanceParameters is ResourceInstanceParameters {
          @path gadgetName: string;
        }

        @route("${pointPath}/gadgets/{gadgetName}")
        interface Gadgets {
          @get get(...NestedResourceInstanceParameters, @query expand?: string): void;
          @put createOrUpdate(
            ...NestedResourceInstanceParameters,
            @query validationMode?: string,
          ): void;
        }
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/valid-query-parameters-for-point-operations",
        message:
          "Query parameter 'expand' should be removed. Point operation 'get' MUST not have query parameters other than api-version.",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/valid-query-parameters-for-point-operations",
        message:
          "Query parameter 'validationMode' should be removed. Point operation 'put' MUST not have query parameters other than api-version.",
      },
    ]);
});

it("emits one diagnostic for each extra query parameter", async () => {
  await tester
    .expect(
      `
        ${service}

        @route("${pointPath}")
        @get
        op get(
          ...ResourceInstanceParameters,
          @query expand?: string,
          @query view?: string,
        ): void;
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/valid-query-parameters-for-point-operations",
        message:
          "Query parameter 'expand' should be removed. Point operation 'get' MUST not have query parameters other than api-version.",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/valid-query-parameters-for-point-operations",
        message:
          "Query parameter 'view' should be removed. Point operation 'get' MUST not have query parameters other than api-version.",
      },
    ]);
});

it("classifies a GET operation by point-path shape regardless of its authoring template", async () => {
  await tester
    .expect(
      `
        ${service}

        @route("${pointPath}/sprockets/{sprocketName}")
        @get
        op getSprocket(
          ...ResourceInstanceParameters,
          @path sprocketName: string,
          @query("$expand") expand?: string,
        ): void;
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/valid-query-parameters-for-point-operations",
      message:
        "Query parameter '$expand' should be removed. Point operation 'get' MUST not have query parameters other than api-version.",
    });
});

it("allows point operations whose only query parameter is api-version", async () => {
  await tester
    .expect(
      `
        ${service}

        @route("${pointPath}")
        interface Widgets {
          @get get(...ResourceInstanceParameters): void;
          @put createOrUpdate(...ResourceInstanceParameters): void;
          @patch update(...ResourceInstanceParameters): void;
          @delete delete(...ResourceInstanceParameters): void;
        }
      `,
    )
    .toBeValid();
});

it("allows query parameters on collection operations", async () => {
  await tester
    .expect(
      `
        ${service}

        @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets")
        @get
        op list(
          @path subscriptionId: string,
          @path resourceGroupName: string,
          @query("api-version") apiVersion: string,
          @query nameFilter?: string,
        ): void;
      `,
    )
    .toBeValid();
});

it("allows query parameters on list-shaped read paths", async () => {
  await tester
    .expect(
      `
        ${service}

        @route("${pointPath}/{recordType}")
        @get
        op listByType(
          ...ResourceInstanceParameters,
          @path recordType: string,
          @query top?: int32,
        ): void;
      `,
    )
    .toBeValid();
});

it("allows query parameters on providerless DELETE operations", async () => {
  await tester
    .expect(
      `
        ${service}

        @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}")
        @delete
        op deleteResourceGroup(
          @path subscriptionId: string,
          @path resourceGroupName: string,
          @query forceDeletionTypes?: string,
        ): void;
      `,
    )
    .toBeValid();
});
