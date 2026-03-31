import { paramMessage } from "@typespec/compiler";
import { deepStrictEqual } from "assert";
import { describe, it } from "vitest";
import { compileOpenAPI } from "./test-host.js";

describe("typespec-autorest: Long-running Operations", () => {
  it("includes x-ms-long-running-operation", async () => {
    const openapi = await compileOpenAPI(
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
      @service(#{
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
          namespace Test;

      alias ServiceTraits = SupportsRepeatableRequests & SupportsConditionalRequests & SupportsClientRequestId;

      alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

      @resource("widgets")
      @doc(".")
      model Widget {
        @key("widgetName")
        @doc(".")
        @visibility(Lifecycle.Read)
        name: string;
        @doc(".")
        manufacturerId: string;
      
      ...EtagProperty;
      }

      op getWidgetOperationStatus is Operations.GetResourceOperationStatus<Widget>;
    
      @pollingOperation(getWidgetOperationStatus)
      op createOrUpdateWidget is Operations.LongRunningResourceCreateOrUpdate<Widget>;
      `,
      { preset: "azure", options: { "emit-lro-options": "all" } },
    );

    deepStrictEqual(
      openapi.paths["/widgets/{widgetName}"].patch?.["x-ms-long-running-operation"],
      true,
    );
    deepStrictEqual(
      openapi.paths["/widgets/{widgetName}"].patch["x-ms-long-running-operation-options"],
      {
        "final-state-via": "operation-location",
        "final-state-schema": "#/definitions/Widget",
      },
    );
    deepStrictEqual(
      openapi.paths["/widgets/{widgetName}/operations/{operationId}"].get?.[
        "x-ms-long-running-operation"
      ],
      undefined,
    );
  });

  it("includes x-ms-long-running-operation for lro get", async () => {
    const openapi = await compileOpenAPI(
      `
      using Azure.Core.Traits;

      @service(#{
        title: "Contoso Widget Manager",
      })
      namespace Test;

      alias ServiceTraits = SupportsRepeatableRequests & SupportsConditionalRequests & SupportsClientRequestId;

      alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

      @resource("widgets")
      model Widget {
        @key("widgetName")
        @visibility(Lifecycle.Read)
        name: string;
        manufacturerId: string;
      
      ...EtagProperty;
      }

      @Azure.ClientGenerator.Core.Legacy.markAsLro
      op getWidgetOperationStatus is Operations.GetResourceOperationStatus<Widget>;
    
      @pollingOperation(getWidgetOperationStatus)
      op createOrUpdateWidget is Operations.LongRunningResourceCreateOrUpdate<Widget>;
      `,
      { preset: "azure", options: { "emit-lro-options": "all" } },
    );

    deepStrictEqual(
      openapi.paths["/widgets/{widgetName}/operations/{operationId}"].get?.[
        "x-ms-long-running-operation"
      ],
      true,
    );
  });

  const armCode = paramMessage`
      @armProviderNamespace
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
        ${"putOp"}
        update is ArmResourcePatchAsync<Widget, WidgetProperties>;
        delete is ArmResourceDeleteWithoutOkAsync<Widget>;
        restart is ArmResourceActionAsync<Widget, void, never>;
        munge is ArmResourceActionAsync<Widget, void, Widget>;
        alter is ArmResourceActionAsync<Widget, void, void, LroHeaders=ArmAsyncOperationHeader<FinalResult = void>>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
        listBySubscription is ArmListBySubscription<Widget>;
      }
      `;
  it("includes x-ms-long-running-operation-options for ARM operations", async () => {
    const openapi = await compileOpenAPI(
      armCode.apply(armCode, [
        { putOp: "createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;" },
      ]),
      { preset: "azure", options: { "emit-lro-options": "all" } },
    );

    const itemPath =
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets/{widgetName}";
    deepStrictEqual(openapi.paths[itemPath].put?.["x-ms-long-running-operation"], true);
    deepStrictEqual(openapi.paths[itemPath].put["x-ms-long-running-operation-options"], {
      "final-state-via": "azure-async-operation",
      "final-state-schema": "#/definitions/Widget",
    });

    deepStrictEqual(openapi.paths[itemPath].patch?.["x-ms-long-running-operation"], true);
    deepStrictEqual(openapi.paths[itemPath].patch["x-ms-long-running-operation-options"], {
      "final-state-via": "location",
      "final-state-schema": "#/definitions/Widget",
    });

    deepStrictEqual(openapi.paths[itemPath].delete?.["x-ms-long-running-operation"], true);
    deepStrictEqual(openapi.paths[itemPath].delete["x-ms-long-running-operation-options"], {
      "final-state-via": "location",
    });
    const restartPath = `${itemPath}/restart`;
    deepStrictEqual(openapi.paths[restartPath].post?.["x-ms-long-running-operation"], true);
    deepStrictEqual(openapi.paths[restartPath].post["x-ms-long-running-operation-options"], {
      "final-state-via": "location",
    });
    const mungePath = `${itemPath}/munge`;
    deepStrictEqual(openapi.paths[mungePath].post?.["x-ms-long-running-operation"], true);
    deepStrictEqual(openapi.paths[mungePath].post["x-ms-long-running-operation-options"], {
      "final-state-via": "location",
      "final-state-schema": "#/definitions/Widget",
    });
    const alterPath = `${itemPath}/alter`;
    deepStrictEqual(openapi.paths[alterPath].post?.["x-ms-long-running-operation"], true);
    deepStrictEqual(openapi.paths[alterPath].post["x-ms-long-running-operation-options"], {
      "final-state-via": "azure-async-operation",
    });
  });
  it("Uses final-state-via: location when location is provided for ARM PUT", async () => {
    const openapi = await compileOpenAPI(
      armCode.apply(armCode, [
        {
          putOp:
            "createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget, LroHeaders = ArmLroLocationHeader<FinalResult = Widget> & Azure.Core.Foundations.RetryAfterHeader>;",
        },
      ]),
      { preset: "azure", options: { "emit-lro-options": "all" } },
    );

    const itemPath =
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets/{widgetName}";
    deepStrictEqual(openapi.paths[itemPath].put?.["x-ms-long-running-operation"], true);
    deepStrictEqual(openapi.paths[itemPath].put["x-ms-long-running-operation-options"], {
      "final-state-via": "location",
      "final-state-schema": "#/definitions/Widget",
    });
  });
  it("Uses final-state-via: original-uri when no lro headers are provided for ARM PUT", async () => {
    const openapi = await compileOpenAPI(
      armCode.apply(armCode, [
        {
          putOp:
            "createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget, LroHeaders = Azure.Core.Foundations.RetryAfterHeader>;",
        },
      ]),
      { preset: "azure", options: { "emit-lro-options": "all" } },
    );

    const itemPath =
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets/{widgetName}";
    deepStrictEqual(openapi.paths[itemPath].put?.["x-ms-long-running-operation"], true);
    deepStrictEqual(openapi.paths[itemPath].put["x-ms-long-running-operation-options"], {
      "final-state-via": "original-uri",
      "final-state-schema": "#/definitions/Widget",
    });
  });

  it("Creates a final state schema for array types", async () => {
    const openapi = await compileOpenAPI(
      armCode.apply(armCode, [
        {
          putOp: "getProcessedWidgets is ArmResourceActionAsync<Widget, void, Widget[]>;",
        },
      ]),
      { preset: "azure", options: { "emit-lro-options": "all" } },
    );

    const itemPath =
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets/{widgetName}/getProcessedWidgets";
    deepStrictEqual(openapi.paths[itemPath].post?.["x-ms-long-running-operation"], true);
    deepStrictEqual(openapi.paths[itemPath].post["x-ms-long-running-operation-options"], {
      "final-state-via": "location",
      "final-state-schema": "#/definitions/WidgetArray",
    });
  });

  it("Creates a final state schema for unknown types", async () => {
    const openapi = await compileOpenAPI(
      armCode.apply(armCode, [
        {
          putOp: "getProcessedWidgets is ArmResourceActionAsync<Widget, void, unknown>;",
        },
      ]),
      { preset: "azure", options: { "emit-lro-options": "all" } },
    );

    const itemPath =
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets/{widgetName}/getProcessedWidgets";
    deepStrictEqual(openapi.paths[itemPath].post?.["x-ms-long-running-operation"], true);
    deepStrictEqual(openapi.paths[itemPath].post["x-ms-long-running-operation-options"], {
      "final-state-via": "location",
      "final-state-schema": "#/definitions/unknown",
    });
  });

  it("Allows azure-async-operation override without headers for ARM PUT", async () => {
    const openapi = await compileOpenAPI(
      armCode.apply(armCode, [
        {
          putOp: `#suppress "@azure-tools/typespec-azure-core/invalid-final-state" "test"
          @useFinalStateVia("azure-async-operation")
          createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget, LroHeaders = Azure.Core.Foundations.RetryAfterHeader>;
          `,
        },
      ]),
      { preset: "azure", options: { "emit-lro-options": "all" } },
    );

    const itemPath =
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets/{widgetName}";
    deepStrictEqual(openapi.paths[itemPath].put?.["x-ms-long-running-operation"], true);
    deepStrictEqual(openapi.paths[itemPath].put["x-ms-long-running-operation-options"], {
      "final-state-via": "azure-async-operation",
      "final-state-schema": "#/definitions/Widget",
    });
  });

  it("Creates a named final-state-schema definition for scalar final results", async () => {
    const openapi = await compileOpenAPI(
      armCode.apply(armCode, [
        {
          putOp: "move is ArmResourceActionAsync<Widget, void, string>;",
        },
      ]),
      { preset: "azure", options: { "emit-lro-options": "all" } },
    );

    const itemPath =
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets/{widgetName}/move";
    deepStrictEqual(openapi.paths[itemPath].post?.["x-ms-long-running-operation"], true);
    deepStrictEqual(openapi.paths[itemPath].post["x-ms-long-running-operation-options"], {
      "final-state-via": "location",
      "final-state-schema": "#/definitions/String",
    });
    // Verify the schema definition is created
    deepStrictEqual(openapi.definitions["String"], { type: "string" });
  });

  it("Reuses the same schema when string is the finalResult in two operations", async () => {
    const openapi = await compileOpenAPI(
      `
      @armProviderNamespace
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
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        move is ArmResourceActionAsync<Widget, void, string>;
        transfer is ArmResourceActionAsync<Widget, void, string>;
      }
      `,
      { preset: "azure", options: { "emit-lro-options": "all" } },
    );

    const basePath =
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets/{widgetName}";
    // Both operations should reference the same schema
    deepStrictEqual(openapi.paths[`${basePath}/move`].post["x-ms-long-running-operation-options"], {
      "final-state-via": "location",
      "final-state-schema": "#/definitions/String",
    });
    deepStrictEqual(
      openapi.paths[`${basePath}/transfer`].post["x-ms-long-running-operation-options"],
      {
        "final-state-via": "location",
        "final-state-schema": "#/definitions/String",
      },
    );
    // Only one String schema should exist
    deepStrictEqual(openapi.definitions["String"], { type: "string" });
  });

  it("Creates separate schemas for two custom scalars with different names", async () => {
    const openapi = await compileOpenAPI(
      `
      @armProviderNamespace
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

      scalar widgetId extends string;
      scalar widgetTag extends string;

      @armResourceOperations(Widget)
      interface Widgets {
        get is ArmResourceRead<Widget>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        move is ArmResourceActionAsync<Widget, void, widgetId>;
        transfer is ArmResourceActionAsync<Widget, void, widgetTag>;
      }
      `,
      { preset: "azure", options: { "emit-lro-options": "all" } },
    );

    const basePath =
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets/{widgetName}";
    deepStrictEqual(openapi.paths[`${basePath}/move`].post["x-ms-long-running-operation-options"], {
      "final-state-via": "location",
      "final-state-schema": "#/definitions/widgetId",
    });
    deepStrictEqual(
      openapi.paths[`${basePath}/transfer`].post["x-ms-long-running-operation-options"],
      {
        "final-state-via": "location",
        "final-state-schema": "#/definitions/widgetTag",
      },
    );
    // Both schemas should exist separately
    deepStrictEqual(openapi.definitions["widgetId"], { type: "string" });
    deepStrictEqual(openapi.definitions["widgetTag"], { type: "string" });
  });

  it("Preserves camelCase in custom scalar names for final-state-schema", async () => {
    const openapi = await compileOpenAPI(
      `
      @armProviderNamespace
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

      scalar myCustomResult extends string;

      @armResourceOperations(Widget)
      interface Widgets {
        get is ArmResourceRead<Widget>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        move is ArmResourceActionAsync<Widget, void, myCustomResult>;
      }
      `,
      { preset: "azure", options: { "emit-lro-options": "all" } },
    );

    const basePath =
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets/{widgetName}";
    deepStrictEqual(openapi.paths[`${basePath}/move`].post["x-ms-long-running-operation-options"], {
      "final-state-via": "location",
      "final-state-schema": "#/definitions/myCustomResult",
    });
    // Verify the schema definition preserves the camelCase name
    deepStrictEqual(openapi.definitions["myCustomResult"], { type: "string" });
  });

  it("Creates separate schemas for custom scalars with the same name in different namespaces", async () => {
    const openapi = await compileOpenAPI(
      `
      @armProviderNamespace
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

      namespace Ns1 {
        scalar customResult extends string;
      }
      namespace Ns2 {
        scalar customResult extends int32;
      }

      @armResourceOperations(Widget)
      interface Widgets {
        get is ArmResourceRead<Widget>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
        move is ArmResourceActionAsync<Widget, void, Ns1.customResult>;
        transfer is ArmResourceActionAsync<Widget, void, Ns2.customResult>;
      }
      `,
      { preset: "azure", options: { "emit-lro-options": "all" } },
    );

    const basePath =
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets/{widgetName}";
    deepStrictEqual(
      openapi.paths[`${basePath}/move`].post["x-ms-long-running-operation-options"][
        "final-state-via"
      ],
      "location",
    );
    deepStrictEqual(
      openapi.paths[`${basePath}/transfer`].post["x-ms-long-running-operation-options"][
        "final-state-via"
      ],
      "location",
    );
    // Both should have distinct final-state-schema references
    const moveSchema =
      openapi.paths[`${basePath}/move`].post["x-ms-long-running-operation-options"][
        "final-state-schema"
      ];
    const transferSchema =
      openapi.paths[`${basePath}/transfer`].post["x-ms-long-running-operation-options"][
        "final-state-schema"
      ];
    // Both should have distinct, specifically-named schema references
    deepStrictEqual(moveSchema, "#/definitions/Ns1.customResult");
    deepStrictEqual(transferSchema, "#/definitions/Ns2.customResult");
    // Both schemas should exist with correct types
    deepStrictEqual(openapi.definitions["Ns1.customResult"], { type: "string" });
    deepStrictEqual(openapi.definitions["Ns2.customResult"], { type: "integer", format: "int32" });
  });
});
