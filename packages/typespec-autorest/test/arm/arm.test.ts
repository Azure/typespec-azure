import { deepStrictEqual, ok, strictEqual } from "assert";
import { it } from "vitest";
import { openApiFor } from "../test-host.js";

it("treats schema for readOnly properties as readOnly", async () => {
  const openapi = await openApiFor(
    `@armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      model FooResourceProperties {
        @visibility("read")
        provisioningState?: ResourceState;
      }

      model FooResource is TrackedResource<FooResourceProperties> {
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }

      @armResourceOperations
      interface Foos extends TrackedResourceOperations<FooResource, FooResourceProperties> {
      }`,
    undefined,
    { "use-read-only-status-schema": true }
  );

  ok(!openapi.isRef);

  deepStrictEqual(openapi.definitions.ResourceState.readOnly, true);
});

it("can share types with a library namespace", async () => {
  const openapi = await openApiFor(
    `
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @armLibraryNamespace
      namespace Microsoft.Library {
        /**
         * A Test Tracked Resource
         */
        model TestTrackedResource is TrackedResource<TestTrackedProperties> {
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
        
        model TestTrackedProperties {
          @visibility("read")
          provisioningState?: ResourceProvisioningState;
        
          @visibility("create", "read")
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
  const openapi = await openApiFor(
    `@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @armProviderNamespace
      namespace Microsoft.PrivateLinkTest;
      
      interface Operations extends Azure.ResourceManager.Operations {}
      
      // Tracked resources
      model TestTrackedResource is TrackedResource<TestTrackedProperties> {
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
      
      model TestTrackedProperties {
        @visibility("read")
        provisioningState?: ResourceProvisioningState;
      
        @visibility("create", "read")
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
  ok(openapi.paths[createPath]);
  deepStrictEqual(openapi.paths[createPath].post.parameters.length, 5);
  ok(openapi.paths[createPath].post.parameters[4].schema);
  ok(openapi.paths[createPath].post.responses["200"]);
  ok(openapi.paths[listPath]);
  ok(openapi.paths[listPath].post.responses["200"]);
});

it("can use private endpoints with common-types references", async () => {
  const openapi = await openApiFor(
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

it("can use ResourceNameParameter for custom name parameter definition", async () => {
  const openapi = await openApiFor(
    `@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @armProviderNamespace
      namespace Microsoft.PrivateLinkTest;
      
      interface Operations extends Azure.ResourceManager.Operations {}
      
      /** Holder for private endpoint connections */
      @tenantResource
      model PrivateEndpointConnectionResource is ProxyResource<PrivateEndpointConnectionProperties> {
        ...ResourceNameParameter<PrivateEndpointConnectionResource, "privateEndpointConnectionName", "privateEndpointConnections", "/[a-zA-Z]*">;
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
  strictEqual(openapi.paths[privateEndpointGet].get.parameters[1].pattern, "/[a-zA-Z]*");
  ok(openapi.paths[privateEndpointGet].get.parameters[1]);
});

it("can use ResourceNameParameter for default name parameter definition", async () => {
  const openapi = await openApiFor(
    `@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @armProviderNamespace
      namespace Microsoft.PrivateLinkTest;
      
      interface Operations extends Azure.ResourceManager.Operations {}
      
      /** Holder for private endpoint connections */
      @tenantResource
      model PrivateEndpointConnection is ProxyResource<PrivateEndpointConnectionProperties> {
        ...ResourceNameParameter<PrivateEndpointConnection>;
      }
      
      /** Private connection operations */
      @armResourceOperations(PrivateEndpointConnection)
      interface PrivateEndpointConnections {
        /** List existing private connections */
        listConnections is ArmResourceListByParent<PrivateEndpointConnection>;
        /** Get a specific private connection */
        getConnection is ArmResourceRead<PrivateEndpointConnection>;
      }
      `
  );

  const privateEndpointList = "/providers/Microsoft.PrivateLinkTest/privateEndpointConnections";
  const privateEndpointGet =
    "/providers/Microsoft.PrivateLinkTest/privateEndpointConnections/{privateEndpointConnectionName}";
  ok(openapi.paths[privateEndpointList]);
  ok(openapi.paths[privateEndpointList].get);
  deepStrictEqual(
    openapi.paths[privateEndpointList].get.responses["200"].schema["$ref"],
    "#/definitions/PrivateEndpointConnectionListResult"
  );
  ok(openapi.definitions.PrivateEndpointConnectionListResult.properties["value"]);
  ok(openapi.paths[privateEndpointGet]);
  ok(openapi.paths[privateEndpointGet].get);
  deepStrictEqual(openapi.paths[privateEndpointGet].get.parameters.length, 2);
  strictEqual(openapi.paths[privateEndpointGet].get.parameters[1].pattern, "^[a-zA-Z0-9-]{3,24}$");
  ok(openapi.paths[privateEndpointGet].get.parameters[1]);
});
