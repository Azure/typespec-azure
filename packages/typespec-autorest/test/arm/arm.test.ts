import { deepStrictEqual, ok, strictEqual } from "assert";
import { it } from "vitest";
import { openApiFor } from "../test-host.js";

it("can share types with a library namespace", async () => {
  const openapi = await openApiFor(
    `
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @armLibraryNamespace
      namespace Microsoft.Library {
        model TestTrackedResource is TrackedResource<TestTrackedProperties> {
          @key("trackedResourceName")
          @segment("trackedResources")
          @visibility(Lifecycle.Read)
          @path
          name: string;
        }
        
        @armResourceOperations(TestTrackedResource)
        interface TrackedOperations
          extends TrackedResourceOperations<TestTrackedResource, TestTrackedProperties> {}
        
        model TestTrackedProperties {
          @visibility(Lifecycle.Read)
          provisioningState?: ResourceProvisioningState;
        
          @visibility(Lifecycle.Create, Lifecycle.Read)
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
      
    }`,
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
     @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v4)
      @armProviderNamespace
      namespace Microsoft.PrivateLinkTest;
      
      interface Operations extends Azure.ResourceManager.Operations {}
      
      model TestTrackedResource is TrackedResource<TestTrackedProperties> {
        @key("trackedResourceName")
        @segment("trackedResources")
        @path
        name: string;
      }
      
      @armResourceOperations(TestTrackedResource)
      interface TrackedOperations
        extends TrackedResourceOperations<TestTrackedResource, TestTrackedProperties> {
        #suppress "deprecated" "test"
        createConnection is ArmResourceActionAsync<
          TestTrackedResource,
          PrivateEndpointConnection,
          PrivateEndpointConnectionResourceListResultV5
        >;
        #suppress "deprecated" "test"
        listConnections is ArmResourceActionAsync<TestTrackedResource, {}, PrivateLinkResourceListResultV5>;
      }
      
      model TestTrackedProperties {
        @visibility(Lifecycle.Read)
        provisioningState?: ResourceProvisioningState;
      
        @visibility(Lifecycle.Create, Lifecycle.Read)
        displayName?: string = "default";
      
        endpoints?: PrivateEndpoint[];
      }
      `,
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
      @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
      namespace Microsoft.PrivateLinkTest;
      
      interface Operations extends Azure.ResourceManager.Operations {}
      
      @tenantResource
      model PrivateEndpointConnectionResource is ProxyResource<PrivateEndpointConnectionProperties> {
        @path
        @segment("privateEndpointConnections")
        @key("privateEndpointConnectionName")
        name: string;
      }
      
      @armResourceOperations(PrivateEndpointConnectionResource)
      interface PrivateEndpointConnections {
        listConnections is ArmResourceListByParent<PrivateEndpointConnectionResource>;
        getConnection is ArmResourceRead<PrivateEndpointConnectionResource>;
      }
      `,
  );

  const privateEndpointList = "/providers/Microsoft.PrivateLinkTest/privateEndpointConnections";
  const privateEndpointGet =
    "/providers/Microsoft.PrivateLinkTest/privateEndpointConnections/{privateEndpointConnectionName}";
  ok(openapi.paths[privateEndpointList]);
  ok(openapi.paths[privateEndpointList].get);
  deepStrictEqual(
    openapi.paths[privateEndpointList].get.responses["200"].schema["$ref"],
    "#/definitions/PrivateEndpointConnectionResourceListResult",
  );
  ok(openapi.definitions.PrivateEndpointConnectionResourceListResult.properties["value"]);
  ok(openapi.paths[privateEndpointGet]);
  ok(openapi.paths[privateEndpointGet].get);
  deepStrictEqual(openapi.paths[privateEndpointGet].get.parameters.length, 2);
  ok(openapi.paths[privateEndpointGet].get.parameters[1]);
});

it("verify resolution of private endpoints and private links with v5 version", async () => {
  const openapi = await openApiFor(
    `@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @armProviderNamespace
      @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
      namespace Microsoft.PrivateLinkTest;
      
      interface Operations extends Azure.ResourceManager.Operations {}
      
      @tenantResource
      model PrivateEndpointConnectionResource is ProxyResource<PrivateEndpointConnectionProperties> {
        @path
        @segment("privateEndpointConnections")
        @key("privateEndpointConnectionName")
        name: string;
      }
      
      @armResourceOperations(PrivateEndpointConnectionResource)
      interface PrivateEndpointConnections {
        #suppress "deprecated" "PrivateLinkResourceListResultV5 validation"
        @get
        @autoRoute
        @segmentOf(PrivateEndpointConnectionResource)
        @armResourceList(PrivateEndpointConnectionResource)
        listConnections (): ArmResponse<Azure.ResourceManager.CommonTypes.PrivateEndpointConnectionListResultV5>;
      }

      model PrivateLinkResource is ProxyResource<PrivateLinkResourceProperties> {
        ...PrivateLinkResourceParameter;
      }

      @armResourceOperations(PrivateLinkResource)
      interface PrivateLinkResources {
        #suppress "deprecated" "PrivateLinkResourceListResultV5 validation"
        @get
        @autoRoute
        @segmentOf(PrivateLinkResource)
        @armResourceList(PrivateLinkResource)
        listConnections (): ArmResponse<Azure.ResourceManager.CommonTypes.PrivateLinkResourceListResultV5>;
      }
      `,
  );

  deepStrictEqual(
    openapi.paths["/privateEndpointConnections"].get.responses["200"].schema["$ref"],
    "../../common-types/resource-management/v5/privatelinks.json#/definitions/PrivateEndpointConnectionListResult",
  );
  deepStrictEqual(
    openapi.paths["/privateLinkResources"].get.responses["200"].schema["$ref"],
    "../../common-types/resource-management/v5/privatelinks.json#/definitions/PrivateLinkResourceListResult",
  );
});

it("can use ResourceNameParameter for custom name parameter definition", async () => {
  const openapi = await openApiFor(
    `@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @armProviderNamespace
      @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
      namespace Microsoft.PrivateLinkTest;
      
      interface Operations extends Azure.ResourceManager.Operations {}
      
      @tenantResource
      model PrivateEndpointConnectionResource is ProxyResource<PrivateEndpointConnectionProperties> {
        ...ResourceNameParameter<PrivateEndpointConnectionResource, "privateEndpointConnectionName", "privateEndpointConnections", "/[a-zA-Z]*">;
      }
      
      /** Private connection operations */
      @armResourceOperations(PrivateEndpointConnectionResource)
      interface PrivateEndpointConnections {
        listConnections is ArmResourceListByParent<PrivateEndpointConnectionResource>;
        getConnection is ArmResourceRead<PrivateEndpointConnectionResource>;
      }
      `,
  );

  const privateEndpointList = "/providers/Microsoft.PrivateLinkTest/privateEndpointConnections";
  const privateEndpointGet =
    "/providers/Microsoft.PrivateLinkTest/privateEndpointConnections/{privateEndpointConnectionName}";
  ok(openapi.paths[privateEndpointList]);
  ok(openapi.paths[privateEndpointList].get);
  deepStrictEqual(
    openapi.paths[privateEndpointList].get.responses["200"].schema["$ref"],
    "#/definitions/PrivateEndpointConnectionResourceListResult",
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
      @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
      namespace Microsoft.PrivateLinkTest;
      
      interface Operations extends Azure.ResourceManager.Operations {}
      
      @tenantResource
      model PrivateEndpointConnection is ProxyResource<PrivateEndpointConnectionProperties> {
        ...ResourceNameParameter<PrivateEndpointConnection>;
      }
      
      @armResourceOperations(PrivateEndpointConnection)
      interface PrivateEndpointConnections {
        listConnections is ArmResourceListByParent<PrivateEndpointConnection>;
        getConnection is ArmResourceRead<PrivateEndpointConnection>;
      }
      `,
  );

  const privateEndpointList = "/providers/Microsoft.PrivateLinkTest/privateEndpointConnections";
  const privateEndpointGet =
    "/providers/Microsoft.PrivateLinkTest/privateEndpointConnections/{privateEndpointConnectionName}";
  ok(openapi.paths[privateEndpointList]);
  ok(openapi.paths[privateEndpointList].get);
  deepStrictEqual(
    openapi.paths[privateEndpointList].get.responses["200"].schema["$ref"],
    "#/definitions/PrivateEndpointConnectionListResult",
  );
  ok(openapi.definitions.PrivateEndpointConnectionListResult.properties["value"]);
  ok(openapi.paths[privateEndpointGet]);
  ok(openapi.paths[privateEndpointGet].get);
  deepStrictEqual(openapi.paths[privateEndpointGet].get.parameters.length, 2);
  strictEqual(openapi.paths[privateEndpointGet].get.parameters[1].pattern, "^[a-zA-Z0-9-]{3,24}$");
  ok(openapi.paths[privateEndpointGet].get.parameters[1]);
});

it("can emit x-ms-client-flatten with optional configuration", async () => {
  const openapi = await openApiFor(
    `@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @armProviderNamespace
      @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
      namespace Microsoft.Contoso;
      
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }
      model EmployeeProperties {
        age?: int32;
        city?: string;
        @visibility(Lifecycle.Read)
        provisioningState?: ResourceProvisioningState;
      }
      @parentResource(Employee)
      model Dependent is ProxyResource<DependentProperties> {
        ...ResourceNameParameter<Dependent>;
      }
      model DependentProperties {
        age?: int32;
      }
      `,
    undefined,
    {
      "arm-resource-flattening": true,
    },
  );

  ok(openapi.definitions.Employee.properties.properties["x-ms-client-flatten"]);
  ok(openapi.definitions.Dependent.properties.properties["x-ms-client-flatten"]);
});

it("no x-ms-client-flatten emitted with default configuration", async () => {
  const openapi = await openApiFor(
    `@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @armProviderNamespace
      @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
      namespace Microsoft.Contoso;
      
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }
      model EmployeeProperties {
        age?: int32;
        city?: string;
        @visibility(Lifecycle.Read)
        provisioningState?: ResourceProvisioningState;
      }
      @parentResource(Employee)
      model Dependent is ProxyResource<DependentProperties> {
        ...ResourceNameParameter<Dependent>;
      }
      model DependentProperties {
        age?: int32;
      }
      `,
  );

  strictEqual(openapi.definitions.Employee.properties.properties["x-ms-client-flatten"], undefined);
  strictEqual(
    openapi.definitions.Dependent.properties.properties["x-ms-client-flatten"],
    undefined,
  );
});
it("generates PATCH bodies for custom patch of common resource envelope mixins", async () => {
  const openapi = await openApiFor(
    `@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @armProviderNamespace
      @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
      namespace Microsoft.PatchTest;
      
      interface Operations extends Azure.ResourceManager.Operations {}
      
      /** The all properties resource */
      model AllPropertiesResource is TrackedResource<AllPropertiesProperties> {
        ...ResourceNameParameter<AllPropertiesResource>;
        ...EncryptionProperty;
        ...EntityTagProperty;
        ...ExtendedLocationProperty;
        ...ManagedByProperty;
        ...ResourceKindProperty;
        ...ResourcePlanProperty;
        ...ResourceSkuProperty;
        ...ManagedServiceIdentityProperty;
      }
      /** rp-specific property bag */
      model AllPropertiesProperties {
        ...DefaultProvisioningStateProperty;
        /** An optional Property */
        optProp?: string;
        /** A required property */
        reqProperty: string;
      }
      /** rp-specific property bag */
      model SystemAssignedProperties {
        ...DefaultProvisioningStateProperty;
        /** An optional Property */
        optProp?: string;
        /** A required property */
        reqProperty: string;
      }
      
      /** The SystemAssignedResource */
      model SystemAssignedResource is TrackedResource<SystemAssignedProperties> {
        ...ResourceNameParameter<SystemAssignedResource>;
        ...ManagedSystemAssignedIdentityProperty;
      }
      
      @armResourceOperations(AllPropertiesResource)
      interface AllProperties {
        get is ArmResourceRead<AllPropertiesResource>;
        put is ArmResourceCreateOrReplaceAsync<AllPropertiesResource>;
        update is ArmCustomPatchAsync<AllPropertiesResource, AllPropertiesResource>;
        delete is ArmResourceDeleteWithoutOkAsync<AllPropertiesResource>;
      }
      @armResourceOperations(SystemAssignedResource)
      interface AssignedOperations {
        get is ArmResourceRead<SystemAssignedResource>;
        put is ArmResourceCreateOrReplaceAsync<SystemAssignedResource>;
        update is ArmCustomPatchAsync<SystemAssignedResource, SystemAssignedResource>;
        delete is ArmResourceDeleteWithoutOkAsync<SystemAssignedResource>;
      }
      `,
  );

  const all = openapi.definitions["AllPropertiesResourceUpdate"];
  const system = openapi.definitions["SystemAssignedResourceUpdate"];
  ok(all);
  ok(system);
  deepStrictEqual(
    all["properties"]["plan"]["$ref"],
    "#/definitions/Azure.ResourceManager.CommonTypes.PlanUpdate",
  );
  deepStrictEqual(
    all["properties"]["sku"]["$ref"],
    "#/definitions/Azure.ResourceManager.CommonTypes.SkuUpdate",
  );
  deepStrictEqual(
    all["properties"]["identity"]["$ref"],
    "#/definitions/Azure.ResourceManager.CommonTypes.ManagedServiceIdentityUpdate",
  );
  deepStrictEqual(
    system["properties"]["identity"]["$ref"],
    "#/definitions/Azure.ResourceManager.CommonTypes.SystemAssignedServiceIdentityUpdate",
  );
  ok(openapi.definitions["Azure.ResourceManager.CommonTypes.PlanUpdate"]);
  ok(openapi.definitions["Azure.ResourceManager.CommonTypes.SkuUpdate"]);
  ok(openapi.definitions["Azure.ResourceManager.CommonTypes.ManagedServiceIdentityUpdate"]);
  ok(openapi.definitions["Azure.ResourceManager.CommonTypes.SystemAssignedServiceIdentityUpdate"]);
  ok(openapi.definitions["Azure.ResourceManager.CommonTypes.TrackedResourceUpdate"]);
  deepStrictEqual(
    openapi.definitions["Azure.ResourceManager.CommonTypes.ResourceModelWithAllowedPropertySet"],
    undefined,
  );
});
it("generates PATCH bodies for resource patch of common resource envelope mixins", async () => {
  const openapi = await openApiFor(
    `@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @armProviderNamespace
      @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
      namespace Microsoft.PatchTest;
      
      interface Operations extends Azure.ResourceManager.Operations {}
      
      /** The all properties resource */
      model AllPropertiesResource is TrackedResource<AllPropertiesProperties> {
        ...ResourceNameParameter<AllPropertiesResource>;
        ...EncryptionProperty;
        ...EntityTagProperty;
        ...ExtendedLocationProperty;
        ...ManagedByProperty;
        ...ResourceKindProperty;
        ...ResourcePlanProperty;
        ...ResourceSkuProperty;
        ...ManagedServiceIdentityProperty;
      }
      /** rp-specific property bag */
      model AllPropertiesProperties {
        ...DefaultProvisioningStateProperty;
        /** An optional Property */
        optProp?: string;
        /** A required property */
        reqProperty: string;
      }
      /** rp-specific property bag */
      model SystemAssignedProperties {
        ...DefaultProvisioningStateProperty;
        /** An optional Property */
        optProp?: string;
        /** A required property */
        reqProperty: string;
      }
      
      /** The SystemAssignedResource */
      model SystemAssignedResource is TrackedResource<SystemAssignedProperties> {
        ...ResourceNameParameter<SystemAssignedResource>;
        ...ManagedSystemAssignedIdentityProperty;
      }
      
      @armResourceOperations(AllPropertiesResource)
      interface AllProperties {
        get is ArmResourceRead<AllPropertiesResource>;
        put is ArmResourceCreateOrReplaceAsync<AllPropertiesResource>;
        update is ArmResourcePatchAsync<AllPropertiesResource, AllPropertiesProperties>;
        delete is ArmResourceDeleteWithoutOkAsync<AllPropertiesResource>;
      }
      @armResourceOperations(SystemAssignedResource)
      interface AssignedOperations {
        get is ArmResourceRead<SystemAssignedResource>;
        put is ArmResourceCreateOrReplaceAsync<SystemAssignedResource>;
        update is ArmResourcePatchAsync<SystemAssignedResource, SystemAssignedProperties>;
        delete is ArmResourceDeleteWithoutOkAsync<SystemAssignedResource>;
      }
      `,
  );

  const all = openapi.definitions["AllPropertiesResourceUpdate"];
  const system = openapi.definitions["SystemAssignedResourceUpdate"];
  ok(all);
  ok(system);
  deepStrictEqual(
    all["properties"]["plan"]["$ref"],
    "#/definitions/Azure.ResourceManager.CommonTypes.PlanUpdate",
  );
  deepStrictEqual(
    all["properties"]["sku"]["$ref"],
    "#/definitions/Azure.ResourceManager.CommonTypes.SkuUpdate",
  );
  deepStrictEqual(
    all["properties"]["identity"]["$ref"],
    "#/definitions/Azure.ResourceManager.CommonTypes.ManagedServiceIdentityUpdate",
  );
  deepStrictEqual(
    system["properties"]["identity"]["$ref"],
    "#/definitions/Azure.ResourceManager.CommonTypes.SystemAssignedServiceIdentityUpdate",
  );
  ok(openapi.definitions["Azure.ResourceManager.CommonTypes.PlanUpdate"]);
  ok(openapi.definitions["Azure.ResourceManager.CommonTypes.SkuUpdate"]);
  ok(openapi.definitions["Azure.ResourceManager.CommonTypes.ManagedServiceIdentityUpdate"]);
  ok(openapi.definitions["Azure.ResourceManager.CommonTypes.SystemAssignedServiceIdentityUpdate"]);
});
