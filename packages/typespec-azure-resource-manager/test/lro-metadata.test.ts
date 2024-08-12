import { LroMetadata, getLroMetadata } from "@azure-tools/typespec-azure-core";
import { Diagnostic, Model } from "@typespec/compiler";
import { BasicTestRunner, expectDiagnosticEmpty } from "@typespec/compiler/testing";
import { HttpOperation, RouteResolutionOptions, getAllHttpServices } from "@typespec/http";
import { deepStrictEqual, ok } from "assert";
import { describe, it } from "vitest";
import { createAzureResourceManagerTestRunner } from "./test-host.js";

async function getOperations(
  code: string,
  routeOptions?: RouteResolutionOptions
): Promise<[HttpOperation[], readonly Diagnostic[], BasicTestRunner]> {
  const runner = await createAzureResourceManagerTestRunner();
  await runner.compileAndDiagnose(code, { noEmit: true });
  const [services] = getAllHttpServices(runner.program, routeOptions);
  return [services[0].operations, runner.program.diagnostics, runner];
}

async function getLroMetadataFor(
  code: string,
  operationName: string
): Promise<[LroMetadata | undefined, readonly Diagnostic[], BasicTestRunner]> {
  const [operations, diagnostics, runner] = await getOperations(code);
  const filteredOperations = operations.filter((o) => o.operation.name === operationName);
  ok(filteredOperations?.length > 0);
  const outOperation = filteredOperations[0];
  return [getLroMetadata(runner.program, outOperation.operation), diagnostics, runner];
}
describe("typespec-azure-resource-manager: ARM LRO Tests", () => {
  it("Returns correct metadata for Async CreateOrUpdate", async () => {
    const [metadata, _diag, _runner] = await getLroMetadataFor(
      `
  @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      @doc("The widget properties")
      model WidgetProperties {
        @doc("I am a simple Resource Identifier")
        simpleArmId: ResourceIdentifier;

        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo resource")
      model Widget is TrackedResource<WidgetProperties> {
        @doc("Widget name")
        @key("widgetName")
        @segment("widgets")
        @path
        name: string;
      }
      @armResourceOperations(Widget)
      interface Widgets {
        get is ArmResourceRead<Widget>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        update is ArmResourcePatchSync<Widget, WidgetProperties>;
        delete is ArmResourceDeleteSync<Widget>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
        listBySubscription is ArmListBySubscription<Widget>;
      }
      
      `,
      "createOrUpdate"
    );
    ok(metadata);
    deepStrictEqual((metadata.finalResult as Model)?.name, "Widget");
    deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "Widget");
    deepStrictEqual(metadata.finalResultPath, undefined);
    deepStrictEqual(metadata.finalStateVia, "azure-async-operation");
  });

  it("Returns correct metadata for Async CreateOrUpdate with final location", async () => {
    const [metadata, _diag, _runner] = await getLroMetadataFor(
      `
  @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      @doc("The widget properties")
      model WidgetProperties {
        @doc("I am a simple Resource Identifier")
        simpleArmId: ResourceIdentifier;

        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo resource")
      model Widget is TrackedResource<WidgetProperties> {
        @doc("Widget name")
        @key("widgetName")
        @segment("widgets")
        @path
        name: string;
      }
      @armResourceOperations(Widget)
      interface Widgets {
        get is ArmResourceRead<Widget>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget, 
          Azure.ResourceManager.Foundations.BaseParameters<Widget>, 
          ArmCombinedLroHeaders<
            ArmOperationStatus,
            Widget,
            string,
            string
          >
      >;
        update is ArmResourcePatchSync<Widget, WidgetProperties>;
        delete is ArmResourceDeleteSync<Widget>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
        listBySubscription is ArmListBySubscription<Widget>;
      }
      
      `,
      "createOrUpdate"
    );
    ok(metadata);
    deepStrictEqual((metadata.finalResult as Model)?.name, "Widget");
    deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "Widget");
    deepStrictEqual(metadata.finalResultPath, undefined);
    deepStrictEqual(metadata.finalStateVia, "location");
  });

  it("Returns correct metadata for Async Update", async () => {
    const [metadata, _diag, _runner] = await getLroMetadataFor(
      `
  @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      @doc("The widget properties")
      model WidgetProperties {
        @doc("I am a simple Resource Identifier")
        simpleArmId: ResourceIdentifier;

        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo resource")
      model Widget is TrackedResource<WidgetProperties> {
        @doc("Widget name")
        @key("widgetName")
        @segment("widgets")
        @path
        name: string;
      }
      @armResourceOperations(Widget)
      interface Widgets {
        get is ArmResourceRead<Widget>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        update is ArmResourcePatchAsync<Widget, WidgetProperties>;
        delete is ArmResourceDeleteSync<Widget>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
        listBySubscription is ArmListBySubscription<Widget>;
      }
      `,
      "update"
    );
    ok(metadata);
    deepStrictEqual((metadata.finalResult as Model)?.name, "Widget");
    deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "Widget");
    deepStrictEqual(metadata.finalResultPath, undefined);
    deepStrictEqual(metadata.finalStateVia, "location");
  });

  it("Returns correct metadata for Async Delete", async () => {
    const [metadata, _diag, _runner] = await getLroMetadataFor(
      `
  @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      @doc("The widget properties")
      model WidgetProperties {
        @doc("I am a simple Resource Identifier")
        simpleArmId: ResourceIdentifier;

        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo resource")
      model Widget is TrackedResource<WidgetProperties> {
        @doc("Widget name")
        @key("widgetName")
        @segment("widgets")
        @path
        name: string;
      }
      @armResourceOperations(Widget)
      interface Widgets {
        get is ArmResourceRead<Widget>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        update is ArmResourcePatchSync<Widget, WidgetProperties>;
        delete is ArmResourceDeleteAsync<Widget>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
        listBySubscription is ArmListBySubscription<Widget>;
      }
      `,
      "delete"
    );
    ok(metadata);
    deepStrictEqual(metadata.finalResult, "void");
    deepStrictEqual(metadata.finalEnvelopeResult, "void");
    deepStrictEqual(metadata.finalResultPath, undefined);
    deepStrictEqual(metadata.finalStateVia, "location");
  });

  it("Returns correct metadata for Async action", async () => {
    const [metadata, _diag, _runner] = await getLroMetadataFor(
      `
  @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      @doc("The widget properties")
      model WidgetProperties {
        @doc("I am a simple Resource Identifier")
        simpleArmId: ResourceIdentifier;

        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("The result of the post request")
      model ResultModel {
        @doc("The result message")
        message: string;
      }

      @doc("The request of the post request")
      model RequestModel {
        @doc("The request message")
        message: string;
      }

      @doc("Foo resource")
      model Widget is TrackedResource<WidgetProperties> {
        @doc("Widget name")
        @key("widgetName")
        @segment("widgets")
        @path
        name: string;
      }

      @armResourceOperations(Widget)
      interface Widgets {
        get is ArmResourceRead<Widget>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        update is ArmResourcePatchSync<Widget, WidgetProperties>;
        delete is ArmResourceDeleteSync<Widget>;
        doStuff is ArmResourceActionAsync<Widget, RequestModel, ResultModel>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
        listBySubscription is ArmListBySubscription<Widget>;
      }
      `,
      "doStuff"
    );
    ok(metadata);
    deepStrictEqual((metadata.finalResult as Model)?.name, "ResultModel");
    deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "ResultModel");
    deepStrictEqual(metadata.finalResultPath, undefined);
    deepStrictEqual(metadata.finalStateVia, "location");
  });
  it("Returns correct metadata for Async action with void return type", async () => {
    const [metadata, _diag, _runner] = await getLroMetadataFor(
      `
  @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      @doc("The widget properties")
      model WidgetProperties {
        @doc("I am a simple Resource Identifier")
        simpleArmId: ResourceIdentifier;

        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("The result of the post request")
      model ResultModel {
        @doc("The result message")
        message: string;
      }

      @doc("The request of the post request")
      model RequestModel {
        @doc("The request message")
        message: string;
      }

      @doc("Foo resource")
      model Widget is TrackedResource<WidgetProperties> {
        @doc("Widget name")
        @key("widgetName")
        @segment("widgets")
        @path
        name: string;
      }

      @armResourceOperations(Widget)
      interface Widgets {
        get is ArmResourceRead<Widget>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        update is ArmResourcePatchSync<Widget, WidgetProperties>;
        delete is ArmResourceDeleteSync<Widget>;
        doStuff is ArmResourceActionAsync<Widget, RequestModel, void, LroHeaders=ArmAsyncOperationHeader<FinalResult = void>>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
        listBySubscription is ArmListBySubscription<Widget>;
      }
      `,
      "doStuff"
    );
    ok(metadata);
    deepStrictEqual(metadata.finalResult, "void");
    deepStrictEqual(metadata.finalEnvelopeResult, "void");
    deepStrictEqual(metadata.finalResultPath, undefined);
    deepStrictEqual(metadata.finalStateVia, "azure-async-operation");
  });

  it("Returns correct metadata for Async CreateOrUpdate with union type ProvisioningState", async () => {
    const [metadata, _diag, _runner] = await getLroMetadataFor(
      `
  @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      union ResourceState {
       Succeeded: "Succeeded",
       Canceled: "Canceled",
       Failed: "Failed",
       string
     }

      @doc("The widget properties")
      model WidgetProperties {
        @doc("I am a simple Resource Identifier")
        simpleArmId: ResourceIdentifier;

        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo resource")
      model Widget is TrackedResource<WidgetProperties> {
        @doc("Widget name")
        @key("widgetName")
        @segment("widgets")
        @path
        name: string;
      }
      @armResourceOperations(Widget)
      interface Widgets {
        get is ArmResourceRead<Widget>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        update is ArmResourcePatchSync<Widget, WidgetProperties>;
        delete is ArmResourceDeleteSync<Widget>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
        listBySubscription is ArmListBySubscription<Widget>;
      }
      
      `,
      "createOrUpdate"
    );
    ok(metadata);
    deepStrictEqual((metadata.finalResult as Model)?.name, "Widget");
    deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "Widget");
    deepStrictEqual(metadata.finalResultPath, undefined);
    deepStrictEqual(metadata.finalStateVia, "azure-async-operation");
  });

  it("Returns correct metadata for Async CreateOrUpdate with final location, with union type ProvisioningState", async () => {
    const [metadata, _diag, _runner] = await getLroMetadataFor(
      `
  @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      union ResourceState {
        Succeeded: "Succeeded",
        Canceled: "Canceled",
        Failed: "Failed"
      }

      @doc("The widget properties")
      model WidgetProperties {
        @doc("I am a simple Resource Identifier")
        simpleArmId: ResourceIdentifier;

        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo resource")
      model Widget is TrackedResource<WidgetProperties> {
        @doc("Widget name")
        @key("widgetName")
        @segment("widgets")
        @path
        name: string;
      }
      @armResourceOperations(Widget)
      interface Widgets {
        get is ArmResourceRead<Widget>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget, 
          Azure.ResourceManager.Foundations.BaseParameters<Widget>, 
          ArmCombinedLroHeaders<
            ArmOperationStatus,
            Widget,
            string,
            string
          >
      >;
        update is ArmResourcePatchSync<Widget, WidgetProperties>;
        delete is ArmResourceDeleteSync<Widget>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
        listBySubscription is ArmListBySubscription<Widget>;
      }
      
      `,
      "createOrUpdate"
    );
    ok(metadata);
    deepStrictEqual((metadata.finalResult as Model)?.name, "Widget");
    deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "Widget");
    deepStrictEqual(metadata.finalResultPath, undefined);
    deepStrictEqual(metadata.finalStateVia, "location");
  });

  it("Returns correct metadata for Async Update with union type ProvisioningState", async () => {
    const [metadata, _diag, _runner] = await getLroMetadataFor(
      `
  @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      union ResourceState {
        Succeeded: "Succeeded",
        Canceled: "Canceled",
        Failed: "Failed"
      }

      @doc("The widget properties")
      model WidgetProperties {
        @doc("I am a simple Resource Identifier")
        simpleArmId: ResourceIdentifier;

        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo resource")
      model Widget is TrackedResource<WidgetProperties> {
        @doc("Widget name")
        @key("widgetName")
        @segment("widgets")
        @path
        name: string;
      }
      @armResourceOperations(Widget)
      interface Widgets {
        get is ArmResourceRead<Widget>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        update is ArmResourcePatchAsync<Widget, WidgetProperties>;
        delete is ArmResourceDeleteSync<Widget>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
        listBySubscription is ArmListBySubscription<Widget>;
      }
      `,
      "update"
    );
    ok(metadata);
    deepStrictEqual((metadata.finalResult as Model)?.name, "Widget");
    deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "Widget");
    deepStrictEqual(metadata.finalResultPath, undefined);
    deepStrictEqual(metadata.finalStateVia, "location");
  });

  it("Returns correct metadata for Async Delete with union type ProvisioningState", async () => {
    const [metadata, _diag, _runner] = await getLroMetadataFor(
      `
  @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      union ResourceState {
        Succeeded: "Succeeded",
        Canceled: "Canceled",
        Failed: "Failed"
      }

      @doc("The widget properties")
      model WidgetProperties {
        @doc("I am a simple Resource Identifier")
        simpleArmId: ResourceIdentifier;

        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo resource")
      model Widget is TrackedResource<WidgetProperties> {
        @doc("Widget name")
        @key("widgetName")
        @segment("widgets")
        @path
        name: string;
      }
      @armResourceOperations(Widget)
      interface Widgets {
        get is ArmResourceRead<Widget>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        update is ArmResourcePatchSync<Widget, WidgetProperties>;
        delete is ArmResourceDeleteAsync<Widget>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
        listBySubscription is ArmListBySubscription<Widget>;
      }
      `,
      "delete"
    );
    ok(metadata);
    deepStrictEqual(metadata.finalResult, "void");
    deepStrictEqual(metadata.finalEnvelopeResult, "void");
    deepStrictEqual(metadata.finalResultPath, undefined);
    deepStrictEqual(metadata.finalStateVia, "location");
  });

  it("Returns correct metadata for Async action with union type ProvisioningState", async () => {
    const [metadata, _diag, _runner] = await getLroMetadataFor(
      `
  @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      union ResourceState {
        Succeeded: "Succeeded",
        Canceled: "Canceled",
        Failed: "Failed"
      }

      @doc("The widget properties")
      model WidgetProperties {
        @doc("I am a simple Resource Identifier")
        simpleArmId: ResourceIdentifier;

        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("The result of the post request")
      model ResultModel {
        @doc("The result message")
        message: string;
      }

      @doc("The request of the post request")
      model RequestModel {
        @doc("The request message")
        message: string;
      }

      @doc("Foo resource")
      model Widget is TrackedResource<WidgetProperties> {
        @doc("Widget name")
        @key("widgetName")
        @segment("widgets")
        @path
        name: string;
      }

      @armResourceOperations(Widget)
      interface Widgets {
        get is ArmResourceRead<Widget>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        update is ArmResourcePatchSync<Widget, WidgetProperties>;
        delete is ArmResourceDeleteSync<Widget>;
        doStuff is ArmResourceActionAsync<Widget, RequestModel, ResultModel>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
        listBySubscription is ArmListBySubscription<Widget>;
      }
      `,
      "doStuff"
    );
    ok(metadata);
    deepStrictEqual((metadata.finalResult as Model)?.name, "ResultModel");
    deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "ResultModel");
    deepStrictEqual(metadata.finalResultPath, undefined);
    deepStrictEqual(metadata.finalStateVia, "location");
  });

  it("Returns correct metadata for Async CreateOrUpdate with final location, with mixed union type ProvisioningState", async () => {
    const [metadata, _diag, _runner] = await getLroMetadataFor(
      `
  @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @useDependency(Azure.Core.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      union BaseState {
        Succeeded: "Succeeded",
      }

      enum BaseState2 {
        Failed,
      }

      @doc("The state of the resource")
      @Azure.Core.lroStatus
      union ResourceState {
        BaseState,
        BaseState2,
        Canceled: "Canceled",
      }

      @doc("The widget properties")
      model WidgetProperties {
        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo resource")
      model Widget is TrackedResource<WidgetProperties> {
        @doc("Widget name")
        @key("widgetName")
        @segment("widgets")
        @path
        name: string;
      }
      @armResourceOperations(Widget)
      interface Widgets {
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget, 
          Azure.ResourceManager.Foundations.BaseParameters<Widget>, 
          ArmCombinedLroHeaders<
            ArmOperationStatus<StatusValues=ResourceState>,
            Widget,
            string,
            string
          >
      >;
      }
      
      `,
      "createOrUpdate"
    );
    ok(metadata);
    expectDiagnosticEmpty(_diag);
    deepStrictEqual((metadata.finalResult as Model)?.name, "Widget");
    deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "Widget");
    deepStrictEqual(metadata.finalResultPath, undefined);
    deepStrictEqual(metadata.finalStateVia, "location");
  });
});
