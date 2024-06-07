import { deepStrictEqual } from "assert";
import { describe, it } from "vitest";
import { openApiFor } from "./test-host.js";

describe("typespec-autorest: Long-running Operations", () => {
  it("includes x-ms-long-running-operation", async () => {
    const openapi = await openApiFor(
      `
      using Azure.Core.Traits;

      @useAuth(
        ApiKeyAuth<ApiKeyLocation.header, "api-key"> | OAuth2Auth<[
          {
            type: OAuth2FlowType.implicit,
            authorizationUrl: "https://login.contoso.com/common/oauth2/v2.0/authorize",
            scopes: ["https://widget.contoso.com/.default"],
          }
        ]>
      )
      @service({
        title: "Contoso Widget Manager",
      })
      @server(
        "{endpoint}/widget",
        "Contoso Widget APIs",
        {
          @doc("""
      Supported Widget Services endpoints (protocol and hostname, for example:
      https://westus.api.widget.contoso.com).
      """)
          endpoint: string,
        }
      )
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      namespace Test;

      alias ServiceTraits = SupportsRepeatableRequests & SupportsConditionalRequests & SupportsClientRequestId;

      alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

      @resource("widgets")
      @doc(".")
      model Widget {
        @key("widgetName")
        @doc(".")
        @visibility("read")
        name: string;
        @doc(".")
        manufacturerId: string;
      
      ...EtagProperty;
      }

      op getWidgetOperationStatus is Operations.GetResourceOperationStatus<Widget>;
    
      @pollingOperation(getWidgetOperationStatus)
      op createOrUpdateWidget is Operations.LongRunningResourceCreateOrUpdate<Widget>;
      `,
      undefined,
      { "emit-lro-options": "all" }
    );

    deepStrictEqual(
      openapi.paths["/widgets/{widgetName}"].patch["x-ms-long-running-operation"],
      true
    );
    deepStrictEqual(
      openapi.paths["/widgets/{widgetName}"].patch["x-ms-long-running-operation-options"],
      {
        "final-state-via": "operation-location",
        "final-state-schema": "#/definitions/Widget",
      }
    );
    deepStrictEqual(
      openapi.paths["/widgets/{widgetName}/operations/{operationId}"].get[
        "x-ms-long-running-operation"
      ],
      undefined
    );
  });

  it("includes x-ms-long-running-operation for ARM operations", async () => {
    const openapi = await openApiFor(
      `
      @armProviderNamespace
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
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
        simpleArmId: Azure.Core.armResourceIdentifier;

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
        @Azure.Core.useFinalStateVia("azure-async-operation")
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        update is ArmResourcePatchAsync<Widget, WidgetProperties>;
        delete is ArmResourceDeleteWithoutOkAsync<Widget>;
        restart is ArmResourceActionAsync<Widget, void, never>;
        munge is ArmResourceActionAsync<Widget, void, Widget>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
        listBySubscription is ArmListBySubscription<Widget>;
      }
      `,
      undefined,
      { "emit-lro-options": "all" }
    );

    const itemPath =
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets/{widgetName}";
    deepStrictEqual(openapi.paths[itemPath].put["x-ms-long-running-operation"], true);
    deepStrictEqual(openapi.paths[itemPath].put["x-ms-long-running-operation-options"], {
      "final-state-via": "azure-async-operation",
      "final-state-schema": "#/definitions/Widget",
    });

    deepStrictEqual(openapi.paths[itemPath].patch["x-ms-long-running-operation"], true);
    deepStrictEqual(openapi.paths[itemPath].patch["x-ms-long-running-operation-options"], {
      "final-state-via": "location",
      "final-state-schema": "#/definitions/Widget",
    });

    deepStrictEqual(openapi.paths[itemPath].delete["x-ms-long-running-operation"], true);
    deepStrictEqual(openapi.paths[itemPath].delete["x-ms-long-running-operation-options"], {
      "final-state-via": "location",
    });
    const restartPath = `${itemPath}/restart`;
    deepStrictEqual(openapi.paths[restartPath].post["x-ms-long-running-operation"], true);
    deepStrictEqual(openapi.paths[restartPath].post["x-ms-long-running-operation-options"], {
      "final-state-via": "location",
    });
    const mungePath = `${itemPath}/munge`;
    deepStrictEqual(openapi.paths[mungePath].post["x-ms-long-running-operation"], true);
    deepStrictEqual(openapi.paths[mungePath].post["x-ms-long-running-operation-options"], {
      "final-state-via": "location",
      "final-state-schema": "#/definitions/Widget",
    });
  });
});
