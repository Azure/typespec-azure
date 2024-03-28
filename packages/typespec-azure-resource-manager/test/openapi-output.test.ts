import { expectDiagnosticEmpty } from "@typespec/compiler/testing";
import { deepStrictEqual, ok } from "assert";
import { describe, it } from "vitest";
import { getOpenApiAndDiagnostics, openApiFor } from "./test-host.js";

describe("typespec-azure-resource-manager: autorest output", () => {
  it("defines simple resource identifier models", async () => {
    const openapi = await openApiFor(
      `@armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      @doc("Foo properties")
      model FooResourceProperties {
        @doc("I am a simple Resource Identifier")
        simpleArmId: Azure.Core.armResourceIdentifier;

        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo resource")
      model FooResource is TrackedResource<FooResourceProperties> {
        @doc("Foo name")
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }

      @armResourceOperations
      interface Foos extends TrackedResourceOperations<FooResource, FooResourceProperties> {
      }`
    );

    ok(!openapi.isRef);

    deepStrictEqual(openapi.definitions.FooResourceProperties.properties.simpleArmId, {
      type: "string",
      description: "I am a simple Resource Identifier",
      format: "arm-id",
    });
  });

  it("defines resource identifier with type only", async () => {
    const openapi = await openApiFor(
      `@armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      @doc("Foo properties")
      model FooResourceProperties {
        @doc("I am a Resource Identifier with type only")
        armIdWithType: Azure.Core.armResourceIdentifier<[{type:"Microsoft.RP/type"}]>;

        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo resource")
      model FooResource is TrackedResource<FooResourceProperties> {
        @doc("Foo name")
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }

      @armResourceOperations
      interface Foos extends TrackedResourceOperations<FooResource, FooResourceProperties> {
      }`
    );

    ok(!openapi.isRef);

    deepStrictEqual(openapi.definitions.FooResourceProperties.properties.armIdWithType, {
      type: "string",
      description: "I am a Resource Identifier with type only",
      format: "arm-id",
      "x-ms-arm-id-details": { allowedResources: [{ type: "Microsoft.RP/type" }] },
    });
  });

  it("defines resource identifier with type and scope", async () => {
    const openapi = await openApiFor(
      `@armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      @doc("Foo properties")
      model FooResourceProperties {
        @doc("I am a a Resource Identifier with type and scopes")
        armIdWithTypeAndScope: Azure.Core.armResourceIdentifier<[{type:"Microsoft.RP/type", scopes:["tenant", "resourceGroup"]}]>;

        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo resource")
      model FooResource is TrackedResource<FooResourceProperties> {
        @doc("Foo name")
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }

      @armResourceOperations
      interface Foos extends TrackedResourceOperations<FooResource, FooResourceProperties> {
      }`
    );

    ok(!openapi.isRef);

    deepStrictEqual(openapi.definitions.FooResourceProperties.properties.armIdWithTypeAndScope, {
      type: "string",
      description: "I am a a Resource Identifier with type and scopes",
      format: "arm-id",
      "x-ms-arm-id-details": {
        allowedResources: [{ type: "Microsoft.RP/type", scopes: ["tenant", "resourceGroup"] }],
      },
    });
  });

  it("defines resource identifier with array of type and scope", async () => {
    const openapi = await openApiFor(
      `@armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      @doc("Foo properties")
      model FooResourceProperties {
        @doc("I am a a Resource Identifier with multiple types and scopes")
        armIdWithMultipleTypeAndScope: Azure.Core.armResourceIdentifier<[{type:"Microsoft.RP/type", scopes:["tenant", "resourceGroup"]}, {type:"Microsoft.RP/type2", scopes:["tenant", "resourceGroup"]}]>;

        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo resource")
      model FooResource is TrackedResource<FooResourceProperties> {
        @doc("Foo name")
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }

      @armResourceOperations
      interface Foos extends TrackedResourceOperations<FooResource, FooResourceProperties> {
      }`
    );

    ok(!openapi.isRef);

    deepStrictEqual(
      openapi.definitions.FooResourceProperties.properties.armIdWithMultipleTypeAndScope,
      {
        type: "string",
        description: "I am a a Resource Identifier with multiple types and scopes",
        format: "arm-id",
        "x-ms-arm-id-details": {
          allowedResources: [
            { type: "Microsoft.RP/type", scopes: ["tenant", "resourceGroup"] },
            { type: "Microsoft.RP/type2", scopes: ["tenant", "resourceGroup"] },
          ],
        },
      }
    );
  });

  it("treats schema for readOnly properties as readOnly", async () => {
    const openapi = await openApiFor(
      `@armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       @doc("Successful completion")
       Succeeded,
       @doc("Operation canceled")
       Canceled,
       @doc("One or more errors occurred")
       Failed
     }

      @doc("Foo properties")
      model FooResourceProperties {
        @doc("The provisioning State")
        @visibility("read")
        provisioningState?: ResourceState;
      }

      @doc("Foo resource")
      model FooResource is TrackedResource<FooResourceProperties> {
        @doc("Foo name")
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }

      @armResourceOperations
      interface Foos extends TrackedResourceOperations<FooResource, FooResourceProperties> {
      }`,
      { "use-read-only-status-schema": true }
    );

    ok(!openapi.isRef);

    deepStrictEqual(openapi.definitions.ResourceState.readOnly, true);
  });

  it("can share types with a library namespace", async () => {
    const [openapi, diagnostics] = await getOpenApiAndDiagnostics(
      `
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @armLibraryNamespace
      namespace Microsoft.Library {
        /**
         * A Test Tracked Resource
         */
        model TestTrackedResource is TrackedResource<TestTrackedProperties> {
          @doc("The name of the Tracked resource.")
          @key("trackedResourceName")
          @segment("trackedResources")
          @visibility("read")
          @path
          name: string;
        }
        
        /** 
         * The operations for a Test Tracked Resource
         */
        @armResourceOperations(TestTrackedResource)
        interface TrackedOperations
          extends TrackedResourceOperations<TestTrackedResource, TestTrackedProperties> {}
        
        @doc("rp-specific properties for the resource with all envelope properties")
        model TestTrackedProperties {
          @doc("The status of the last operation performed on this resource.")
          @visibility("read")
          provisioningState?: ResourceProvisioningState;
        
          @visibility("create", "read")
          @doc("Name of the resource")
          displayName?: string = "default";
        }
        
      }

      @useLibraryNamespace(Microsoft.Library)
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test {

      interface Operations extends Azure.ResourceManager.Operations {}

      @armResourceOperations
      interface TestTrackedOperations extends Microsoft.Library.TrackedOperations {}
      
    }`
    );

    const listSubscriptionPath =
      "/subscriptions/{subscriptionId}/providers/Microsoft.Test/trackedResources";
    const listResourceGroupPath =
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/trackedResources";
    const itemPath =
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/trackedResources/{trackedResourceName}";

    expectDiagnosticEmpty(diagnostics);
    ok(openapi.definitions["Microsoft.Library.TestTrackedResource"]);
    ok(openapi.definitions["Microsoft.Library.TestTrackedProperties"]);
    ok(openapi.definitions.TestTrackedResourceListResult);
    ok(openapi.definitions.TestTrackedResourceUpdate);
    ok(!openapi.definitions.TestTrackedProperties);
    ok(!openapi.definitions.TestTrackedResource);
    ok(openapi.paths[listSubscriptionPath]);
    ok(openapi.paths[listSubscriptionPath].get);
    ok(openapi.paths[listResourceGroupPath]);
    ok(openapi.paths[listResourceGroupPath].get);
    ok(openapi.paths[itemPath]);
    ok(openapi.paths[itemPath].get);
    ok(openapi.paths[itemPath].put);
    ok(openapi.paths[itemPath].patch);
    ok(openapi.paths[itemPath].delete);
  });

  it("can use private links with common-types references", async () => {
    const [openapi, diagnostics] = await getOpenApiAndDiagnostics(
      `@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @armProviderNamespace
      namespace Microsoft.PrivateLinkTest;
      
      interface Operations extends Azure.ResourceManager.Operations {}
      
      // Tracked resources
      model TestTrackedResource is TrackedResource<TestTrackedProperties> {
        @doc("The name of the Tracked resource.")
        @key("trackedResourceName")
        @segment("trackedResources")
        @path
        name: string;
      }
      
      @armResourceOperations(TestTrackedResource)
      interface TrackedOperations
        extends TrackedResourceOperations<TestTrackedResource, TestTrackedProperties> {
        createConnection is ArmResourceActionAsync<
          TestTrackedResource,
          PrivateEndpointConnection,
          PrivateEndpointConnectionResourceListResult
        >;
        listConnections is ArmResourceActionAsync<TestTrackedResource, {}, PrivateLinkResourceListResult>;
      }
      
      @doc("rp-specific properties for the resource with all envelope properties")
      model TestTrackedProperties {
        @doc("The status of the last operation performed on this resource.")
        @visibility("read")
        provisioningState?: ResourceProvisioningState;
      
        @visibility("create", "read")
        @doc("Name of the resource")
        displayName?: string = "default";
      
        /** The private endpoints exposed by this resource */
        endpoints?: PrivateEndpoint[];
      }
      `
    );

    const createPath =
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.PrivateLinkTest/trackedResources/{trackedResourceName}/createConnection";
    const listPath =
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.PrivateLinkTest/trackedResources/{trackedResourceName}/listConnections";
    expectDiagnosticEmpty(diagnostics);
    ok(openapi.paths[createPath]);
    deepStrictEqual(openapi.paths[createPath].post.parameters.length, 5);
    ok(openapi.paths[createPath].post.parameters[4].schema);
    ok(openapi.paths[createPath].post.responses["200"]);
    ok(openapi.paths[listPath]);
    ok(openapi.paths[listPath].post.responses["200"]);
  });

  it("can use private endpoints with common-types references", async () => {
    const [openapi, diagnostics] = await getOpenApiAndDiagnostics(
      `@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @armProviderNamespace
      namespace Microsoft.PrivateLinkTest;
      
      interface Operations extends Azure.ResourceManager.Operations {}
      
      /** Holder for private endpoint connections */
      @tenantResource
      model PrivateEndpointConnectionResource is ProxyResource<PrivateEndpointConnectionProperties> {
        /** The name of the connection */
        @path
        @segment("privateEndpointConnections")
        @key("privateEndpointConnectionName")
        name: string;
      }
      
      /** Private connection operations */
      @armResourceOperations(PrivateEndpointConnectionResource)
      interface PrivateEndpointConnections {
        /** List existing private connections */
        listConnections is ArmResourceListByParent<PrivateEndpointConnectionResource>;
        /** Get a specific private connection */
        getConnection is ArmResourceRead<PrivateEndpointConnectionResource>;
      }
      `
    );

    const privateEndpointList = "/providers/Microsoft.PrivateLinkTest/privateEndpointConnections";
    const privateEndpointGet =
      "/providers/Microsoft.PrivateLinkTest/privateEndpointConnections/{privateEndpointConnectionName}";
    expectDiagnosticEmpty(diagnostics);
    ok(openapi.paths[privateEndpointList]);
    ok(openapi.paths[privateEndpointList].get);
    deepStrictEqual(
      openapi.paths[privateEndpointList].get.responses["200"].schema["$ref"],
      "#/definitions/PrivateEndpointConnectionResourceListResult"
    );
    ok(openapi.definitions.PrivateEndpointConnectionResourceListResult.properties["value"]);
    ok(openapi.paths[privateEndpointGet]);
    ok(openapi.paths[privateEndpointGet].get);
    deepStrictEqual(openapi.paths[privateEndpointGet].get.parameters.length, 2);
    ok(openapi.paths[privateEndpointGet].get.parameters[1]);
  });
});
