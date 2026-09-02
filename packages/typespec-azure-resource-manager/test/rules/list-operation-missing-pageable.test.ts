import { Tester } from "#test/tester.js";
import {
  createLinterRuleTester,
  type LinterRuleTester,
  type TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { listOperationMissingPageableRule } from "../../src/rules/list-operation-missing-pageable.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    listOperationMissingPageableRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const diagnosticCode =
  "@azure-tools/typespec-azure-resource-manager/list-operation-missing-pageable";

it("allows a standard ARM list operation template", async () => {
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
        listByResourceGroup is ArmResourceListByParent<Widget>;
      }
      `,
    )
    .toBeValid();
});

it("reports a custom ARM list operation without pageable metadata", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Widget is ProxyResource<{}> {
        ...ResourceNameParameter<Widget>;
      }

      @route("/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/widgetSummaries")
      @get
      @armResourceList(Widget)
      op listSummaries(@path subscriptionId: string): { count: int32 };
      `,
    )
    .toEmitDiagnostics({
      code: diagnosticCode,
      target: "listSummaries",
    });
});

it("reports an ARM collection GET in a child provider namespace", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      namespace Inventory {
        @route("/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/widgetSummaries")
        @get
        op listSummaries(@path subscriptionId: string): { count: int32 };
      }
      `,
    )
    .toEmitDiagnostics({
      code: diagnosticCode,
      target: "listSummaries",
    });
});

it("allows an explicit truthy x-ms-pageable extension", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Widget is ProxyResource<{}> {
        ...ResourceNameParameter<Widget>;
      }

      @route("/providers/Microsoft.Contoso/widgets")
      @get
      @armResourceList(Widget)
      @TypeSpec.OpenAPI.extension("x-ms-pageable", #{ nextLinkName: null })
      op listWidgets(): Widget[];
      `,
    )
    .toBeValid();
});

it("reports a falsy x-ms-pageable extension", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Widget is ProxyResource<{}> {
        ...ResourceNameParameter<Widget>;
      }

      @route("/providers/Microsoft.Contoso/widgets")
      @get
      @armResourceList(Widget)
      @TypeSpec.OpenAPI.extension("x-ms-pageable", null)
      op listWidgets(): Widget[];
      `,
    )
    .toEmitDiagnostics({
      code: diagnosticCode,
      target: "listWidgets",
    });
});

it("reports a list operation with page items but no next link", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Widget is ProxyResource<{}> {
        ...ResourceNameParameter<Widget>;
      }

      model WidgetPage {
        @pageItems
        value: Widget[];
      }

      @route("/providers/Microsoft.Contoso/widgets")
      @get
      @list
      @armResourceList(Widget)
      op listWidgets(): WidgetPage;
      `,
    )
    .toEmitDiagnostics({
      code: diagnosticCode,
      target: "listWidgets",
    });
});

it("reports raw ARM collection GETs but ignores point and default paths", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      @route("/providers/Microsoft.Contoso/widgets")
      @get
      op listWidgets(): string[];

      @route("/{resourceUri}/providers/Microsoft.Contoso/widgets")
      @get
      op listNestedWidgets(@path resourceUri: string): string[];

      @route("/{resourceUri}/providers/Microsoft.Contoso/widgets/{widgetName}")
      @get
      op getWidget(@path resourceUri: string, @path widgetName: string): string;

      @route("/{resourceUri}/providers/Microsoft.Contoso/widgets/default")
      @get
      op getDefaultWidget(@path resourceUri: string): string;
      `,
    )
    .toEmitDiagnostics([
      { code: diagnosticCode, target: "listWidgets" },
      { code: diagnosticCode, target: "listNestedWidgets" },
    ]);
});

it("reports the ARM operations endpoint as a collection path", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      @route("/providers/Microsoft.Contoso/operations")
      @get
      op listOperations(): string[];
      `,
    )
    .toEmitDiagnostics({
      code: diagnosticCode,
      target: "listOperations",
    });
});

it("ignores dynamic provider paths and uninstantiated templates", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      @route("/providers/{providerNamespace}/widgets")
      @get
      op listWidgets(@path providerNamespace: string): string[];

      interface GenericLists<Resource extends TypeSpec.Reflection.Model> {
        @route("/providers/Microsoft.Contoso/genericItems")
        @get
        op list<Response extends {}>(): Response;
      }
      `,
    )
    .toBeValid();
});
