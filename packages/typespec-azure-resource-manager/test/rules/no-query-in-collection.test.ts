import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, expect, it } from "vitest";
import {
  collectionGetInvalidQueryParameterRule,
  createReportedParameterKey,
} from "../../src/rules/collection-get-invalid-query-parameter.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    collectionGetInvalidQueryParameterRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const diagnosticCode =
  "@azure-tools/typespec-azure-resource-manager/collection-get-invalid-query-parameter";

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

it("reports library-provided query parameters on the local operation", async () => {
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
    .toEmitDiagnostics([
      { code: diagnosticCode, target: "listWidgets" },
      { code: diagnosticCode, target: "listWidgets" },
      { code: diagnosticCode, target: "listWidgets" },
    ]);
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

it("does not report collection GETs outside an ARM provider namespace", async () => {
  await tester
    .expect(
      `
      namespace Contoso;

      @route("/widgets")
      @get
      op listWidgets(@query continuationToken?: string): void;
      `,
    )
    .toBeValid();
});

it("deduplicates sibling child namespaces by their ARM provider namespace", async () => {
  await runner.compile(`
    @armProviderNamespace
    namespace Microsoft.Contoso {
      namespace First {}
      namespace Second {}
    }
  `);

  const microsoft = runner.program.getGlobalNamespaceType().namespaces.get("Microsoft")!;
  const provider = microsoft.namespaces.get("Contoso")!;
  const firstChild = provider.namespaces.get("First")!;
  const secondChild = provider.namespaces.get("Second")!;
  const path = "/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/widgets";

  expect(createReportedParameterKey(runner.program, firstChild, path, "continuationToken")).toBe(
    createReportedParameterKey(runner.program, secondChild, path, "continuationToken"),
  );
});

it("keeps identical paths from different ARM providers distinct", async () => {
  await runner.compile(`
    namespace Microsoft {
      @armProviderNamespace
      namespace First {}

      @armProviderNamespace
      namespace Second {}
    }
  `);

  const microsoft = runner.program.getGlobalNamespaceType().namespaces.get("Microsoft")!;
  const firstProvider = microsoft.namespaces.get("First")!;
  const secondProvider = microsoft.namespaces.get("Second")!;
  const path = "/subscriptions/{subscriptionId}/providers/Microsoft.Shared/widgets";

  expect(
    createReportedParameterKey(runner.program, firstProvider, path, "continuationToken"),
  ).not.toBe(createReportedParameterKey(runner.program, secondProvider, path, "continuationToken"));
});
