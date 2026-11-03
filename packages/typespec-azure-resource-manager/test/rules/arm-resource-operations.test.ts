import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { armResourceOperationsRule } from "../../src/rules/arm-resource-operation-response.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armResourceOperationsRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("emits diagnostics if response type is different from resource type.", async () => {
  await tester
    .expect(
      `
              @armProviderNamespace
        namespace Microsoft.Foo;

        model FooResource is TrackedResource<{}> {
          ...ResourceNameParameter<FooResource>;
        }

        model BarResource is TrackedResource<{}> {
          ...ResourceNameParameter<BarResource>;
        }

        @armResourceOperations
        interface FooResources {
          @get @armResourceRead(FooResource) get(@key("foo") name: string): ArmResponse<BarResource> | ErrorResponse;
          @put @armResourceCreateOrUpdate(FooResource) create(...ResourceInstanceParameters<FooResource>, @bodyRoot resource: FooResource): ArmResponse<FooResource> | ArmCreatedResponse<FooResource> | ErrorResponse;
          @get @armResourceList(FooResource) listBySubscription(...Foundations.SubscriptionScope<FooResource>): ArmResponse<ResourceListResult<FooResource>> | ErrorResponse;
        }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response",
      message: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
    });
});

it("emits diagnostics if response type of create operation is different from resource type.", async () => {
  await tester
    .expect(
      `
              @armProviderNamespace
        namespace Microsoft.Foo;

        model FooResource is TrackedResource<{}> {
          ...ResourceNameParameter<FooResource>;
        }

        model BarResource is TrackedResource<{}> {
          ...ResourceNameParameter<BarResource>;
        }

        @armResourceOperations
        interface FooResources {
          @put @armResourceCreateOrUpdate(FooResource) create(...ResourceInstanceParameters<FooResource>, @bodyRoot resource: FooResource): ArmResponse<FooResource> | ArmCreatedResponse<BarResource> | ErrorResponse;
        }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response",
      message: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
    });
});

it("emits diagnostics if response type of list operation is different from resource type.", async () => {
  await tester
    .expect(
      `
              @armProviderNamespace
        namespace Microsoft.Foo;
        
        model FooResource is TrackedResource<{}> {
          ...ResourceNameParameter<FooResource>;
        }

        model BarResource is TrackedResource<{}> {
          ...ResourceNameParameter<BarResource>;
        }

        @armResourceOperations
        interface FooResources {
          @get @armResourceList(FooResource) listBySubscription(...Foundations.SubscriptionScope<FooResource>): ArmResponse<ResourceListResult<BarResource>> | ErrorResponse;
        }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response",
      message: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
    });
});

const collectionDiagnostic = {
  code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response",
  message:
    "The value array items in a collection GET response must match the response schema of the corresponding individual GET operation.",
};

function resourceResponses(readResponse: string, listItem: string): string {
  return `
    @armProviderNamespace
    namespace Microsoft.Foo;

    model FooResource is TrackedResource<{}> {
      ...ResourceNameParameter<FooResource>;
    }
    model Summary { name: string; }
    model ListResult {
      @pageItems value: ${listItem}[];
      @nextLink nextLink?: string;
    }

    @armResourceOperations
    interface FooResources {
      get is ArmResourceRead<FooResource, Response = ArmResponse<${readResponse}>>;
      list is ArmResourceListByParent<FooResource, Response = ArmResponse<ListResult>>;
    }
  `;
}

it.each([
  ["FooResource", "Summary"],
  ["Summary", "FooResource"],
  ["FooResource", "string"],
])("reports mismatched GET %s and LIST %s responses", async (readResponse, listItem) => {
  await tester
    .expect(resourceResponses(readResponse, listItem))
    .toEmitDiagnostics(collectionDiagnostic);
});

it.each(["FooResource", "Summary"])(
  "accepts matching GET and LIST responses returning %s",
  async (response) => {
    await tester.expect(resourceResponses(response, response)).toBeValid();
  },
);

function routeResponses(
  readResponse: string,
  listResponse: string,
  models = "",
): string {
  return `
    @armProviderNamespace
    namespace Microsoft.Foo;

    model Widget { name: string; }
    model Summary { displayName: string; }
    model WidgetList { value: Widget[]; nextLink?: string; }
    model SummaryList { value: Summary[]; nextLink?: string; }
    ${models}

    @route("/providers/Microsoft.Foo/widgets/{widgetName}")
    @get
    op read(@path widgetName: string): ${readResponse};

    @route("/providers/Microsoft.Foo/widgets")
    @get
    op list(): ${listResponse};
  `;
}

it.each([
  ["Widget", "SummaryList"],
  ["ArmResponse<Widget> | ErrorResponse", "ArmResponse<SummaryList> | ErrorResponse"],
  ["Widget", "InheritedList"],
  ["Widget", "ArmResponse<ListVariants> | ErrorResponse"],
])("checks actual HTTP bodies for GET %s and LIST %s", async (readResponse, listResponse) => {
  await tester
    .expect(
      routeResponses(
        readResponse,
        listResponse,
        `
          model InheritedList extends SummaryList {}
          union ListVariants { WidgetList, SummaryList }
        `,
      ),
    )
    .toEmitDiagnostics(collectionDiagnostic);
});

it.each([
  ["Widget", "WidgetList"],
  ["Summary", "SummaryList"],
  ["ArmResponse<Widget> | ErrorResponse", "ArmResponse<WidgetList> | ErrorResponse"],
  ["Widget", "{ value: {...Widget}[]; nextLink?: string; }"],
  ["Widget", "{ @statusCode statusCode: 201; @body body: SummaryList; }"],
])("accepts compatible or non-200 responses for GET %s and LIST %s", async (read, list) => {
  await tester.expect(routeResponses(read, list)).toBeValid();
});

it("reports only once for multiple mismatched collection response variants", async () => {
  await tester
    .expect(
      routeResponses(
        "Widget",
        "ArmResponse<ListVariants>",
        `
          model AnotherList { value: string[]; }
          union ListVariants { SummaryList, AnotherList }
        `,
      ),
    )
    .toEmitDiagnostics(collectionDiagnostic);
});

it("pairs different scopes and parent parameter names", async () => {
  await tester
    .expect(`
      @armProviderNamespace
      namespace Microsoft.Foo;

      model Widget { name: string; }
      model Summary { displayName: string; }
      model WidgetList { value: Summary[]; }

      @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Foo/parents/{parentName}/widgets/{widgetName}")
      @get
      op read(
        @path subscriptionId: string,
        @path resourceGroupName: string,
        @path parentName: string,
        @path widgetName: string,
      ): Widget;

      @route("/subscriptions/{subscriptionId}/providers/Microsoft.Foo/parents/{parent}/widgets/")
      @get
      op list(@path subscriptionId: string, @path parent: string): WidgetList;
    `)
    .toEmitDiagnostics(collectionDiagnostic);
});

it("does not compare unrelated provider paths", async () => {
  await tester
    .expect(`
      @armProviderNamespace
      namespace Microsoft.Foo;

      model Widget { name: string; }
      model OtherList { value: string[]; }

      @route("/providers/Microsoft.Foo/widgets/{widgetName}")
      @get
      op read(@path widgetName: string): Widget;

      @route("/providers/Microsoft.Bar/widgets")
      @get
      op list(): OtherList;
    `)
    .toBeValid();
});

it("does not invent a GET response for a list-only resource", async () => {
  await tester
    .expect(`
      @armProviderNamespace
      namespace Microsoft.Foo;

      model FooResource is TrackedResource<{}> {
        ...ResourceNameParameter<FooResource>;
      }
      model Summary { displayName: string; }
      model SummaryList {
        @pageItems value: Summary[];
        @nextLink nextLink?: string;
      }
      @armResourceOperations
      interface FooResources {
        list is ArmResourceListByParent<FooResource, Response = ArmResponse<SummaryList>>;
      }
    `)
    .toBeValid();
});

it("does not apply GET collection comparison outside ARM", async () => {
  await tester
    .expect(
      routeResponses("Widget", "SummaryList").replace("@armProviderNamespace", "@service"),
    )
    .toBeValid();
});

it("does not treat POST responses as collection GETs", async () => {
  await tester
    .expect(
      routeResponses("Widget", "SummaryList").replace("@get\n    op list", "@post\n    op list"),
    )
    .toBeValid();
});
