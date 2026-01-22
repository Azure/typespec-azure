import { deepStrictEqual, ok, strictEqual } from "assert";
import { expect, it } from "vitest";
import { compileOpenAPI, CompileOpenApiWithFeatures } from "../test-host.js";

it("can share types with a library namespace", async () => {
  const openapi: any = await compileOpenAPI(
    `
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
          namespace Microsoft.Test {

      interface Operations extends Azure.ResourceManager.Operations {}

      @armResourceOperations
      interface TestTrackedOperations extends Microsoft.Library.TrackedOperations {}
      
    }`,
    { preset: "azure" },
  );

  const listSubscriptionPath =
    "/subscriptions/{subscriptionId}/providers/Microsoft.Test/trackedResources";
  const listResourceGroupPath =
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/trackedResources";
  const itemPath =
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/trackedResources/{trackedResourceName}";

  ok(openapi.definitions?.["Microsoft.Library.TestTrackedResource"]);
  ok(openapi.definitions?.["Microsoft.Library.TestTrackedProperties"]);
  ok(openapi.definitions?.TestTrackedResourceListResult);
  ok(openapi.definitions?.TestTrackedResourceUpdate);
  ok(!openapi.definitions?.TestTrackedProperties);
  ok(!openapi.definitions?.TestTrackedResource);
  ok(openapi.paths?.[listSubscriptionPath]);
  ok(openapi.paths?.[listSubscriptionPath]?.get);
  ok(openapi.paths?.[listResourceGroupPath]);
  ok(openapi.paths?.[listResourceGroupPath]?.get);
  ok(openapi.paths?.[itemPath]);
  ok(openapi.paths?.[itemPath]?.get);
  ok(openapi.paths?.[itemPath]?.put);
  ok(openapi.paths?.[itemPath]?.patch);
  ok(openapi.paths?.[itemPath]?.delete);
});

it("can use private links with common-types references", async () => {
  const openapi: any = await compileOpenAPI(
    `
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
    { preset: "azure" },
  );

  const createPath =
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.PrivateLinkTest/trackedResources/{trackedResourceName}/createConnection";
  const listPath =
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.PrivateLinkTest/trackedResources/{trackedResourceName}/listConnections";
  ok(openapi.paths?.[createPath]);
  deepStrictEqual(openapi.paths?.[createPath]?.post?.parameters?.length, 5);
  ok(openapi.paths?.[createPath]?.post?.parameters?.[4]?.schema);
  ok(openapi.paths?.[createPath]?.post?.responses?.["200"]);
  ok(openapi.paths?.[listPath]);
  ok(openapi.paths?.[listPath]?.post?.responses?.["200"]);
});

it("can use private endpoints with common-types references", async () => {
  const openapi: any = await compileOpenAPI(
    `
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
    { preset: "azure" },
  );

  const privateEndpointList = "/providers/Microsoft.PrivateLinkTest/privateEndpointConnections";
  const privateEndpointGet =
    "/providers/Microsoft.PrivateLinkTest/privateEndpointConnections/{privateEndpointConnectionName}";
  ok(openapi.paths?.[privateEndpointList]);
  ok(openapi.paths?.[privateEndpointList]?.get);
  deepStrictEqual(
    openapi.paths?.[privateEndpointList]?.get?.responses?.["200"]?.schema?.["$ref"],
    "#/definitions/PrivateEndpointConnectionResourceListResult",
  );
  ok(openapi.definitions?.PrivateEndpointConnectionResourceListResult?.properties?.["value"]);
  ok(openapi.paths?.[privateEndpointGet]);
  ok(openapi.paths?.[privateEndpointGet]?.get);
  deepStrictEqual(openapi.paths?.[privateEndpointGet]?.get?.parameters?.length, 2);
  ok(openapi.paths?.[privateEndpointGet]?.get?.parameters?.[1]);
});

it("verify resolution of private endpoints and private links with v5 version", async () => {
  const openapi: any = await compileOpenAPI(
    `
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
        listConnections is ArmResourceListByParent<PrivateEndpointConnectionResource,
         Response = ArmResponse<Azure.ResourceManager.CommonTypes.PrivateEndpointConnectionListResultV5>>;
      }

      model PrivateLinkResource is ProxyResource<PrivateLinkResourceProperties> {
        ...PrivateLinkResourceParameter;
      }

      @armResourceOperations(PrivateLinkResource)
      interface PrivateLinkResources {
        #suppress "deprecated" "PrivateLinkResourceListResultV5 validation"
        listByLinkResult is ArmResourceListByParent< PrivateLinkResource,
          Response = ArmResponse<Azure.ResourceManager.CommonTypes.PrivateLinkResourceListResultV5>
        >;
      }
      `,
    { preset: "azure" },
  );

  const privateEndpointList = "/providers/Microsoft.PrivateLinkTest/privateEndpointConnections";
  const privateLinkList =
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.PrivateLinkTest/privateLinkResources";

  deepStrictEqual(
    openapi.paths[privateEndpointList].get.responses["200"].schema["$ref"],
    "../../common-types/resource-management/v5/privatelinks.json#/definitions/PrivateEndpointConnectionListResult",
  );
  deepStrictEqual(
    openapi.paths[privateLinkList].get.responses["200"].schema["$ref"],
    "../../common-types/resource-management/v5/privatelinks.json#/definitions/PrivateLinkResourceListResult",
  );
});

it("can use ResourceNameParameter for custom name parameter definition", async () => {
  const openapi: any = await compileOpenAPI(
    `
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
    { preset: "azure" },
  );

  const privateEndpointList = "/providers/Microsoft.PrivateLinkTest/privateEndpointConnections";
  const privateEndpointGet =
    "/providers/Microsoft.PrivateLinkTest/privateEndpointConnections/{privateEndpointConnectionName}";
  ok(openapi.paths?.[privateEndpointList]);
  ok(openapi.paths?.[privateEndpointList]?.get);
  deepStrictEqual(
    openapi.paths?.[privateEndpointList]?.get?.responses?.["200"]?.schema?.["$ref"],
    "#/definitions/PrivateEndpointConnectionResourceListResult",
  );
  ok(openapi.definitions?.PrivateEndpointConnectionResourceListResult?.properties?.["value"]);
  ok(openapi.paths?.[privateEndpointGet]);
  ok(openapi.paths?.[privateEndpointGet]?.get);
  deepStrictEqual(openapi.paths?.[privateEndpointGet]?.get?.parameters?.length, 2);
  strictEqual(openapi.paths?.[privateEndpointGet]?.get?.parameters?.[1]?.pattern, "/[a-zA-Z]*");
  ok(openapi.paths?.[privateEndpointGet]?.get?.parameters?.[1]);
});

it("can use ResourceNameParameter for default name parameter definition", async () => {
  const openapi: any = await compileOpenAPI(
    `
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
    { preset: "azure" },
  );

  const privateEndpointList = "/providers/Microsoft.PrivateLinkTest/privateEndpointConnections";
  const privateEndpointGet =
    "/providers/Microsoft.PrivateLinkTest/privateEndpointConnections/{privateEndpointConnectionName}";
  ok(openapi.paths?.[privateEndpointList]);
  ok(openapi.paths?.[privateEndpointList]?.get);
  deepStrictEqual(
    openapi.paths?.[privateEndpointList]?.get?.responses?.["200"]?.schema?.["$ref"],
    "#/definitions/PrivateEndpointConnectionListResult",
  );
  ok(openapi.definitions?.PrivateEndpointConnectionListResult?.properties?.["value"]);
  ok(openapi.paths?.[privateEndpointGet]);
  ok(openapi.paths?.[privateEndpointGet]?.get);
  deepStrictEqual(openapi.paths?.[privateEndpointGet]?.get?.parameters?.length, 2);
  strictEqual(
    openapi.paths?.[privateEndpointGet]?.get?.parameters?.[1]?.pattern,
    "^[a-zA-Z0-9-]{3,24}$",
  );
  ok(openapi.paths?.[privateEndpointGet]?.get?.parameters?.[1]);
});

it("no x-ms-client-flatten emitted with default configuration", async () => {
  const openapi: any = await compileOpenAPI(
    `
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
    { preset: "azure" },
  );

  strictEqual(
    openapi.definitions?.Employee?.properties?.properties?.["x-ms-client-flatten"],
    undefined,
  );
  strictEqual(
    openapi.definitions?.Dependent?.properties?.properties?.["x-ms-client-flatten"],
    undefined,
  );
});
it("generates PATCH bodies for custom patch of common resource envelope mixins", async () => {
  const openapi: any = await compileOpenAPI(
    `
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
         @patch(#{ implicitOptionality: true })
        update is ArmCustomPatchAsync<AllPropertiesResource, AllPropertiesResource>;
        delete is ArmResourceDeleteWithoutOkAsync<AllPropertiesResource>;
      }
      @armResourceOperations(SystemAssignedResource)
      interface AssignedOperations {
        get is ArmResourceRead<SystemAssignedResource>;
        put is ArmResourceCreateOrReplaceAsync<SystemAssignedResource>;
        @patch(#{ implicitOptionality: true })
        update is ArmCustomPatchAsync<SystemAssignedResource, SystemAssignedResource>;
        delete is ArmResourceDeleteWithoutOkAsync<SystemAssignedResource>;
      }
      `,
    { preset: "azure" },
  );

  const all = openapi.definitions?.["AllPropertiesResourceUpdate"];
  const system = openapi.definitions?.["SystemAssignedResourceUpdate"];
  ok(all);
  ok(system);
  deepStrictEqual(
    all?.["properties"]?.["plan"]?.["$ref"],
    "#/definitions/Azure.ResourceManager.CommonTypes.PlanUpdate",
  );
  deepStrictEqual(
    all?.["properties"]?.["sku"]?.["$ref"],
    "#/definitions/Azure.ResourceManager.CommonTypes.SkuUpdate",
  );
  deepStrictEqual(
    all?.["properties"]?.["identity"]?.["$ref"],
    "#/definitions/Azure.ResourceManager.CommonTypes.ManagedServiceIdentityUpdate",
  );
  deepStrictEqual(
    system?.["properties"]?.["identity"]?.["$ref"],
    "#/definitions/Azure.ResourceManager.CommonTypes.SystemAssignedServiceIdentityUpdate",
  );
  ok(openapi.definitions?.["Azure.ResourceManager.CommonTypes.PlanUpdate"]);
  ok(openapi.definitions?.["Azure.ResourceManager.CommonTypes.SkuUpdate"]);
  ok(openapi.definitions?.["Azure.ResourceManager.CommonTypes.ManagedServiceIdentityUpdate"]);
  ok(
    openapi.definitions?.["Azure.ResourceManager.CommonTypes.SystemAssignedServiceIdentityUpdate"],
  );
  ok(openapi.definitions?.["Azure.ResourceManager.CommonTypes.TrackedResourceUpdate"]);
  deepStrictEqual(
    openapi.definitions?.["Azure.ResourceManager.CommonTypes.ResourceModelWithAllowedPropertySet"],
    undefined,
  );
});
it("generates PATCH bodies for resource patch of common resource envelope mixins", async () => {
  const openapi: any = await compileOpenAPI(
    `
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
    { preset: "azure" },
  );

  const all = openapi.definitions?.["AllPropertiesResourceUpdate"];
  const system = openapi.definitions?.["SystemAssignedResourceUpdate"];
  ok(all);
  ok(system);
  deepStrictEqual(
    all?.["properties"]?.["plan"]?.["$ref"],
    "#/definitions/Azure.ResourceManager.CommonTypes.PlanUpdate",
  );
  deepStrictEqual(
    all?.["properties"]?.["sku"]?.["$ref"],
    "#/definitions/Azure.ResourceManager.CommonTypes.SkuUpdate",
  );
  deepStrictEqual(
    all?.["properties"]?.["identity"]?.["$ref"],
    "#/definitions/Azure.ResourceManager.CommonTypes.ManagedServiceIdentityUpdate",
  );
  deepStrictEqual(
    system?.["properties"]?.["identity"]?.["$ref"],
    "#/definitions/Azure.ResourceManager.CommonTypes.SystemAssignedServiceIdentityUpdate",
  );
  ok(openapi.definitions?.["Azure.ResourceManager.CommonTypes.PlanUpdate"]);
  ok(openapi.definitions?.["Azure.ResourceManager.CommonTypes.SkuUpdate"]);
  ok(openapi.definitions?.["Azure.ResourceManager.CommonTypes.ManagedServiceIdentityUpdate"]);
  ok(
    openapi.definitions?.["Azure.ResourceManager.CommonTypes.SystemAssignedServiceIdentityUpdate"],
  );
});
it("can split resources and operations by feature", async () => {
  const { privateLink, privateEndpoint } = await CompileOpenApiWithFeatures(
    `
      @Azure.ResourceManager.Legacy.features(Features)
      @armProviderNamespace
      @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
      namespace Microsoft.PrivateLinkTest;

      enum Features {
        privateLink;
        privateEndpoint;
        common;
      }
      
      interface Operations extends Azure.ResourceManager.Operations {}
      
      @Azure.ResourceManager.Legacy.feature(Features.privateEndpoint)
      @tenantResource
      model PrivateEndpointConnectionResource is ProxyResource<PrivateEndpointConnectionProperties> {
        @path
        @segment("privateEndpointConnections")
        @key("privateEndpointConnectionName")
        name: string;
      }
      
      @Azure.ResourceManager.Legacy.feature(Features.privateEndpoint)
      @armResourceOperations(PrivateEndpointConnectionResource)
      interface PrivateEndpointConnections {
        #suppress "deprecated" "PrivateLinkResourceListResultV5 validation"
        listConnections is ArmResourceListByParent<PrivateEndpointConnectionResource,
         Response = ArmResponse<Azure.ResourceManager.CommonTypes.PrivateEndpointConnectionListResultV5>>;
      }

      @Azure.ResourceManager.Legacy.feature(Features.privateLink)
      model PrivateLinkResource is ProxyResource<PrivateLinkResourceProperties> {
        ...PrivateLinkResourceParameter;
      }

      @Azure.ResourceManager.Legacy.feature(Features.privateLink)
      @armResourceOperations(PrivateLinkResource)
      interface PrivateLinkResources {
        #suppress "deprecated" "PrivateLinkResourceListResultV5 validation"
        listByLinkResult is ArmResourceListByParent< PrivateLinkResource,
          Response = ArmResponse<Azure.ResourceManager.CommonTypes.PrivateLinkResourceListResultV5>
        >;
      }
      `,
    ["privateLink", "privateEndpoint", "common"],
    { preset: "azure" },
  );

  const privateEndpointList = "/providers/Microsoft.PrivateLinkTest/privateEndpointConnections";
  const privateLinkList =
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.PrivateLinkTest/privateLinkResources";
  const pe = privateEndpoint as any;
  const pl = privateLink as any;

  deepStrictEqual(
    pe.paths[privateEndpointList].get.responses["200"].schema["$ref"],
    "../../common-types/resource-management/v5/privatelinks.json#/definitions/PrivateEndpointConnectionListResult",
  );
  deepStrictEqual(
    pl.paths[privateLinkList].get.responses["200"].schema["$ref"],
    "../../common-types/resource-management/v5/privatelinks.json#/definitions/PrivateLinkResourceListResult",
  );
});
it("can represent type references within and between features", async () => {
  const { featureA, featureB, shared } = await CompileOpenApiWithFeatures(
    `

@Azure.ResourceManager.Legacy.features(Features)
@armProviderNamespace("Microsoft.Test")
namespace Microsoft.Test;
enum Features {
  /** Common */
  @Azure.ResourceManager.Legacy.featureOptions(#{featureName: "Common", fileName: "shared", description: "The data for common features"})
  Common: "Common",
  /** Feature A */
  @Azure.ResourceManager.Legacy.featureOptions(#{featureName: "FeatureA", fileName: "featureA", description: "The data for feature A"})
  FeatureA: "Feature A",
  /** Feature B */
  @Azure.ResourceManager.Legacy.featureOptions(#{featureName: "FeatureB", fileName: "featureB", description: "The data for feature B"})
  FeatureB: "Feature B",
}
      @secret
      scalar secretString extends string;

      @Azure.ResourceManager.Legacy.feature(Features.FeatureA)
      model FooResource is TrackedResource<FooResourceProperties> {
         ...ResourceNameParameter<FooResource>;
      }
      
      @Azure.ResourceManager.Legacy.feature(Features.FeatureA)
      model FooResourceProperties { 
        ...DefaultProvisioningStateProperty;
        password: secretString;
      }

      @Azure.ResourceManager.Legacy.feature(Features.FeatureB)
      model BarResource is ProxyResource<BarResourceProperties> {
          ...ResourceNameParameter<BarResource>;
      }
      @Azure.ResourceManager.Legacy.feature(Features.FeatureB)
      model BarResourceProperties { 
        ...DefaultProvisioningStateProperty;
        password: secretString;
      }

      @Azure.ResourceManager.Legacy.feature(Features.FeatureA)
      @armResourceOperations
      interface Foos extends Azure.ResourceManager.TrackedResourceOperations<FooResource, FooResourceProperties> {}

      @Azure.ResourceManager.Legacy.feature(Features.FeatureB)
      @armResourceOperations
      interface Bars extends Azure.ResourceManager.TrackedResourceOperations<BarResource, BarResourceProperties> {}
      `,
    ["featureA", "featureB", "shared"],
    { preset: "azure" },
  );

  const aFile = featureA as any;
  const bFile = featureB as any;
  const commonFile = shared as any;

  expect(aFile.definitions).toBeDefined();
  expect(aFile.definitions["FooResource"]).toBeDefined();
  expect(aFile.definitions["FooResource"].properties["properties"].$ref).toBe(
    "#/definitions/FooResourceProperties",
  );
  expect(aFile.definitions["FooResourceProperties"]).toBeDefined();
  expect(aFile.definitions["FooResourceProperties"].properties["password"].$ref).toBe(
    "./shared.json#/definitions/secretString",
  );
  expect(aFile.definitions["FooResourceListResult"]).toBeDefined();
  expect(aFile.definitions["FooResourceUpdate"]).toBeDefined();
  expect(aFile.definitions["FooResourceUpdateProperties"]).toBeDefined();

  expect(bFile.definitions).toBeDefined();
  expect(bFile.definitions["BarResource"]).toBeDefined();
  expect(bFile.definitions["BarResource"].properties["properties"].$ref).toBe(
    "#/definitions/BarResourceProperties",
  );
  expect(bFile.definitions["BarResourceProperties"]).toBeDefined();
  expect(bFile.definitions["BarResourceProperties"].properties["password"].$ref).toBe(
    "./shared.json#/definitions/secretString",
  );
  expect(bFile.definitions["BarResourceProperties"].properties["provisioningState"].$ref).toBe(
    "./shared.json#/definitions/Azure.ResourceManager.ResourceProvisioningState",
  );
  expect(bFile.definitions["BarResourceListResult"]).toBeDefined();
  expect(bFile.definitions["BarResourceUpdate"]).toBeDefined();
  expect(bFile.definitions["BarResourceUpdateProperties"]).toBeDefined();

  expect(commonFile.definitions).toBeDefined();
  expect(commonFile.definitions["secretString"]).toBeDefined();
});
