import { Tester } from "#test/tester.js";
import {
  createLinterRuleTester,
  type LinterRuleTester,
  type TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noQueryInCollectionRule } from "../../src/rules/no-query-in-collection.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noQueryInCollectionRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const diagnosticCode = "@azure-tools/typespec-azure-resource-manager/no-query-in-collection";

it("reports one extra query parameter on an ARM collection list operation", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Widget is TrackedResource<{}> {
        ...ResourceNameParameter<Widget>;
      }

      @armResourceOperations
      interface Widgets {
        listByResourceGroup is ArmResourceListByParent<
          Widget,
          Parameters = { @query nameFilter?: string }
        >;
      }
      `,
    )
    .toEmitDiagnostics({
      code: diagnosticCode,
      message:
        "Query parameter 'nameFilter' should be removed. Collection GET operations must not have query parameters other than api-version and $filter.",
    });
});

it("reports every extra query parameter on a collection GET", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      @route("/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/widgets")
      @get
      op listWidgets(
        @path subscriptionId: string,
        @query("api-version") apiVersion: string,
        @query nameFilter?: string,
        @query tag?: string,
      ): void;
      `,
    )
    .toEmitDiagnostics([
      {
        code: diagnosticCode,
        message:
          "Query parameter 'nameFilter' should be removed. Collection GET operations must not have query parameters other than api-version and $filter.",
      },
      {
        code: diagnosticCode,
        message:
          "Query parameter 'tag' should be removed. Collection GET operations must not have query parameters other than api-version and $filter.",
      },
    ]);
});

it("allows api-version and $filter on a collection GET", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      @route("/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/widgets")
      @get
      op listWidgets(
        @path subscriptionId: string,
        @query("api-version") apiVersion: string,
        @query("$filter") filter?: string,
      ): void;
      `,
    )
    .toBeValid();
});

it("reports a raw collection-shaped GET without ARM list registration", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      @route("/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/widgets/{widgetName}/records")
      @get
      op listRecords(
        @path subscriptionId: string,
        @path widgetName: string,
        @query("api-version") apiVersion: string,
        @query continuationToken?: string,
      ): void;
      `,
    )
    .toEmitDiagnostics({
      code: diagnosticCode,
      message:
        "Query parameter 'continuationToken' should be removed. Collection GET operations must not have query parameters other than api-version and $filter.",
    });
});

it("reports a mis-cased $FILTER query parameter", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      @route("/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/widgets")
      @get
      op listWidgets(
        @path subscriptionId: string,
        @query("api-version") apiVersion: string,
        @query("$FILTER") filter?: string,
      ): void;
      `,
    )
    .toEmitDiagnostics({
      code: diagnosticCode,
      message:
        "Query parameter '$FILTER' should be removed. Collection GET operations must not have query parameters other than api-version and $filter.",
    });
});

it("ignores library-provided query parameters", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      @route("/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/widgets")
      @get
      op listWidgets(
        @path subscriptionId: string,
        @query("api-version") apiVersion: string,
        ...Azure.Core.StandardListQueryParameters,
      ): void;
      `,
    )
    .toBeValid();
});

it("checks operations in a child namespace of an ARM provider", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso {
        namespace Subarea {
          @route("/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/widgets")
          @get
          op listWidgets(
            @path subscriptionId: string,
            @query("api-version") apiVersion: string,
            @query continuationToken?: string,
          ): void;
        }
      }
      `,
    )
    .toEmitDiagnostics({
      code: diagnosticCode,
      message:
        "Query parameter 'continuationToken' should be removed. Collection GET operations must not have query parameters other than api-version and $filter.",
    });
});

it("allows extra query parameters on a point GET", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      @route("/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/widgets/{widgetName}")
      @get
      op getWidget(
        @path subscriptionId: string,
        @path widgetName: string,
        @query("api-version") apiVersion: string,
        @query viewMode?: string,
      ): void;
      `,
    )
    .toBeValid();
});

it("allows extra query parameters on a non-GET collection operation", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      @route("/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/widgets")
      @post
      op searchWidgets(
        @path subscriptionId: string,
        @query("api-version") apiVersion: string,
        @query search?: string,
      ): void;
      `,
    )
    .toBeValid();
});

it("reports collection GETs outside an ARM provider namespace when enabled directly", async () => {
  await tester
    .expect(
      `
      namespace Contoso;

      @route("/providers/Contoso.Widgets/widgets")
      @get
      op listWidgets(@query continuationToken?: string): void;
      `,
    )
    .toEmitDiagnostics({
      code: diagnosticCode,
      message:
        "Query parameter 'continuationToken' should be removed. Collection GET operations must not have query parameters other than api-version and $filter.",
    });
});
