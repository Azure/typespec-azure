import { LroMetadata, getLroMetadata } from "@azure-tools/typespec-azure-core";
import { Model, Program } from "@typespec/compiler";
import { HttpOperation, getAllHttpServices } from "@typespec/http";
import { deepStrictEqual, ok } from "assert";
import { it } from "vitest";
import { Tester } from "./tester.js";

async function getOperations(code: string): Promise<[HttpOperation[], Program]> {
  const { program } = await Tester.compile(code);
  const [services] = getAllHttpServices(program);
  return [services[0].operations, program];
}

async function getLroMetadataFor(
  code: string,
  operationName: string,
): Promise<LroMetadata | undefined> {
  const [operations, program] = await getOperations(code);
  const filteredOperations = operations.filter((o) => o.operation.name === operationName);
  ok(filteredOperations?.length > 0);
  const outOperation = filteredOperations[0];
  return getLroMetadata(program, outOperation.operation);
}
it("Returns correct metadata for Async CreateOrUpdate", async () => {
  const metadata = await getLroMetadataFor(
    `
      @armProviderNamespace
      namespace Microsoft.Test;

      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      model WidgetProperties {
        simpleArmId: Azure.Core.armResourceIdentifier;

        provisioningState: ResourceState;
      }

      model Widget is TrackedResource<WidgetProperties> {
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
    "createOrUpdate",
  );
  ok(metadata);
  deepStrictEqual((metadata.finalResult as Model)?.name, "Widget");
  deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "Widget");
  deepStrictEqual(metadata.finalResultPath, undefined);
  deepStrictEqual(metadata.finalStateVia, "azure-async-operation");
});

it("Returns correct metadata for Async CreateOrUpdate with final location", async () => {
  const metadata = await getLroMetadataFor(
    `
      @armProviderNamespace
      namespace Microsoft.Test;

      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      model WidgetProperties {
        simpleArmId: Azure.Core.armResourceIdentifier;

        provisioningState: ResourceState;
      }

      model Widget is TrackedResource<WidgetProperties> {
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
    "createOrUpdate",
  );
  ok(metadata);
  deepStrictEqual((metadata.finalResult as Model)?.name, "Widget");
  deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "Widget");
  deepStrictEqual(metadata.finalResultPath, undefined);
  deepStrictEqual(metadata.finalStateVia, "location");
});

it("Returns correct metadata for Async Update", async () => {
  const metadata = await getLroMetadataFor(
    `
      @armProviderNamespace
      namespace Microsoft.Test;

      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      model WidgetProperties {
        simpleArmId: Azure.Core.armResourceIdentifier;

        provisioningState: ResourceState;
      }

      model Widget is TrackedResource<WidgetProperties> {
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
    "update",
  );
  ok(metadata);
  deepStrictEqual((metadata.finalResult as Model)?.name, "Widget");
  deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "Widget");
  deepStrictEqual(metadata.finalResultPath, undefined);
  deepStrictEqual(metadata.finalStateVia, "location");
});

it("Returns correct metadata for Async Delete", async () => {
  const metadata = await getLroMetadataFor(
    `
      @armProviderNamespace
      namespace Microsoft.Test;

      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      model WidgetProperties {
        simpleArmId: Azure.Core.armResourceIdentifier;
        provisioningState: ResourceState;
      }

      model Widget is TrackedResource<WidgetProperties> {
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
        #suppress "deprecated" "test"
        delete is ArmResourceDeleteAsync<Widget>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
        listBySubscription is ArmListBySubscription<Widget>;
      }
      `,
    "delete",
  );
  ok(metadata);
  deepStrictEqual(metadata.finalResult, "void");
  deepStrictEqual(metadata.finalEnvelopeResult, "void");
  deepStrictEqual(metadata.finalResultPath, undefined);
  deepStrictEqual(metadata.finalStateVia, "location");
});

it("Returns correct metadata for Async action", async () => {
  const metadata = await getLroMetadataFor(
    `
  @armProviderNamespace
      namespace Microsoft.Test;

      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      model WidgetProperties {
        simpleArmId: Azure.Core.armResourceIdentifier;

        provisioningState: ResourceState;
      }

      model ResultModel {
        message: string;
      }

      model RequestModel {
        message: string;
      }

      model Widget is TrackedResource<WidgetProperties> {
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
    "doStuff",
  );
  ok(metadata);
  deepStrictEqual((metadata.finalResult as Model)?.name, "ResultModel");
  deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "ResultModel");
  deepStrictEqual(metadata.finalResultPath, undefined);
  deepStrictEqual(metadata.finalStateVia, "location");
});
it("Returns correct metadata for Async action with void return type", async () => {
  const metadata = await getLroMetadataFor(
    `
      @armProviderNamespace
      namespace Microsoft.Test;

      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      model WidgetProperties {
        simpleArmId: Azure.Core.armResourceIdentifier;

        provisioningState: ResourceState;
      }

      model ResultModel {
        message: string;
      }

      model RequestModel {
        message: string;
      }

      model Widget is TrackedResource<WidgetProperties> {
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
    "doStuff",
  );
  ok(metadata);
  deepStrictEqual(metadata.finalResult, "void");
  deepStrictEqual(metadata.finalEnvelopeResult, "void");
  deepStrictEqual(metadata.finalResultPath, undefined);
  deepStrictEqual(metadata.finalStateVia, "azure-async-operation");
});

it("Returns correct metadata for Async CreateOrUpdate with union type ProvisioningState", async () => {
  const metadata = await getLroMetadataFor(
    `
      @armProviderNamespace
      namespace Microsoft.Test;

      union ResourceState {
       Succeeded: "Succeeded",
       Canceled: "Canceled",
       Failed: "Failed",
       string
     }

      model WidgetProperties {
        simpleArmId: Azure.Core.armResourceIdentifier;

        provisioningState: ResourceState;
      }

      model Widget is TrackedResource<WidgetProperties> {
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
    "createOrUpdate",
  );
  ok(metadata);
  deepStrictEqual((metadata.finalResult as Model)?.name, "Widget");
  deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "Widget");
  deepStrictEqual(metadata.finalResultPath, undefined);
  deepStrictEqual(metadata.finalStateVia, "azure-async-operation");
});

it("Returns correct metadata for Async CreateOrUpdate with final location, with union type ProvisioningState", async () => {
  const metadata = await getLroMetadataFor(
    `
      @armProviderNamespace
      namespace Microsoft.Test;

      union ResourceState {
        Succeeded: "Succeeded",
        Canceled: "Canceled",
        Failed: "Failed"
      }

      model WidgetProperties {
        simpleArmId: Azure.Core.armResourceIdentifier;

        provisioningState: ResourceState;
      }

      model Widget is TrackedResource<WidgetProperties> {
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
    "createOrUpdate",
  );
  ok(metadata);
  deepStrictEqual((metadata.finalResult as Model)?.name, "Widget");
  deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "Widget");
  deepStrictEqual(metadata.finalResultPath, undefined);
  deepStrictEqual(metadata.finalStateVia, "location");
});

it("Returns correct metadata for Async CreateOrUpdate with final operation, with union type ProvisioningState", async () => {
  const metadata = await getLroMetadataFor(
    `
      @armProviderNamespace
      namespace Microsoft.Test;

      union ResourceState {
        Succeeded: "Succeeded",
        Canceled: "Canceled",
        Failed: "Failed"
      }

      model WidgetProperties {
        simpleArmId: Azure.Core.armResourceIdentifier;

        provisioningState: ResourceState;
      }

      model Widget is TrackedResource<WidgetProperties> {
        @key("widgetName")
        @segment("widgets")
        @path
        name: string;
      }
      @armResourceOperations(Widget)
      interface Widgets {
        get is ArmResourceRead<Widget>;
        @Azure.Core.finalOperation(Widgets.get)
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        update is ArmResourcePatchSync<Widget, WidgetProperties>;
        delete is ArmResourceDeleteSync<Widget>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
        listBySubscription is ArmListBySubscription<Widget>;
      }
      
      `,
    "createOrUpdate",
  );
  ok(metadata);
  deepStrictEqual((metadata.finalResult as Model)?.name, "Widget");
  deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "Widget");
  deepStrictEqual(metadata.finalResultPath, undefined);
  deepStrictEqual(metadata.finalStateVia, "azure-async-operation");
});

it("Returns correct metadata for Async Update with final operation, with union type ProvisioningState", async () => {
  const metadata = await getLroMetadataFor(
    `
      @armProviderNamespace
      namespace Microsoft.Test;

      union ResourceState {
        Succeeded: "Succeeded",
        Canceled: "Canceled",
        Failed: "Failed"
      }

      model WidgetProperties {
        simpleArmId: Azure.Core.armResourceIdentifier;

        provisioningState: ResourceState;
      }

      model Widget is TrackedResource<WidgetProperties> {
        @key("widgetName")
        @segment("widgets")
        @path
        name: string;
      }
      @armResourceOperations(Widget)
      interface Widgets {
        get is ArmResourceRead<Widget>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        @Azure.Core.finalOperation(Widgets.get)
        update is ArmResourcePatchAsync<Widget, WidgetProperties>;
        delete is ArmResourceDeleteSync<Widget>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
        listBySubscription is ArmListBySubscription<Widget>;
      }
      
      `,
    "update",
  );
  ok(metadata);
  deepStrictEqual((metadata.finalResult as Model)?.name, "Widget");
  deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "Widget");
  deepStrictEqual(metadata.finalResultPath, undefined);
  deepStrictEqual(metadata.finalStateVia, "original-uri");
});

it("Returns correct metadata for Async Update with union type ProvisioningState", async () => {
  const metadata = await getLroMetadataFor(
    `
      @armProviderNamespace
      namespace Microsoft.Test;

      union ResourceState {
        Succeeded: "Succeeded",
        Canceled: "Canceled",
        Failed: "Failed"
      }

      model WidgetProperties {
        simpleArmId: Azure.Core.armResourceIdentifier;

        provisioningState: ResourceState;
      }

      model Widget is TrackedResource<WidgetProperties> {
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
    "update",
  );
  ok(metadata);
  deepStrictEqual((metadata.finalResult as Model)?.name, "Widget");
  deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "Widget");
  deepStrictEqual(metadata.finalResultPath, undefined);
  deepStrictEqual(metadata.finalStateVia, "location");
});

it("Returns correct metadata for Async Delete with union type ProvisioningState", async () => {
  const metadata = await getLroMetadataFor(
    `
      @armProviderNamespace
      namespace Microsoft.Test;

      union ResourceState {
        Succeeded: "Succeeded",
        Canceled: "Canceled",
        Failed: "Failed"
      }

      model WidgetProperties {
        simpleArmId: Azure.Core.armResourceIdentifier;

        provisioningState: ResourceState;
      }

      model Widget is TrackedResource<WidgetProperties> {
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
        #suppress "deprecated" "test"
        delete is ArmResourceDeleteAsync<Widget>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
        listBySubscription is ArmListBySubscription<Widget>;
      }
      `,
    "delete",
  );
  ok(metadata);
  deepStrictEqual(metadata.finalResult, "void");
  deepStrictEqual(metadata.finalEnvelopeResult, "void");
  deepStrictEqual(metadata.finalResultPath, undefined);
  deepStrictEqual(metadata.finalStateVia, "location");
});

it("Returns correct metadata for Async action with union type ProvisioningState", async () => {
  const metadata = await getLroMetadataFor(
    `
      @armProviderNamespace
      namespace Microsoft.Test;

      union ResourceState {
        Succeeded: "Succeeded",
        Canceled: "Canceled",
        Failed: "Failed"
      }

      model WidgetProperties {
        simpleArmId: Azure.Core.armResourceIdentifier;

        provisioningState: ResourceState;
      }

      model ResultModel {
        message: string;
      }

      model RequestModel {
        message: string;
      }

      model Widget is TrackedResource<WidgetProperties> {
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
    "doStuff",
  );
  ok(metadata);
  deepStrictEqual((metadata.finalResult as Model)?.name, "ResultModel");
  deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "ResultModel");
  deepStrictEqual(metadata.finalResultPath, undefined);
  deepStrictEqual(metadata.finalStateVia, "location");
});

it("Returns correct metadata for Async CreateOrUpdate with final location, with mixed union type ProvisioningState", async () => {
  const metadata = await getLroMetadataFor(
    `
      @armProviderNamespace
      namespace Microsoft.Test;

      union BaseState {
        Succeeded: "Succeeded",
      }

      enum BaseState2 {
        Failed,
      }

      @Azure.Core.lroStatus
      union ResourceState {
        BaseState,
        BaseState2,
        Canceled: "Canceled",
      }

      model WidgetProperties {
        provisioningState: ResourceState;
      }

      model Widget is TrackedResource<WidgetProperties> {
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
    "createOrUpdate",
  );
  ok(metadata);
  deepStrictEqual((metadata.finalResult as Model)?.name, "Widget");
  deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "Widget");
  deepStrictEqual(metadata.finalResultPath, undefined);
  deepStrictEqual(metadata.finalStateVia, "location");
});
