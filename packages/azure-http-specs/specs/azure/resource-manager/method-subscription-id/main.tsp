import "@typespec/http";
import "@typespec/rest";
import "@typespec/spector";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";
import "@azure-tools/typespec-client-generator-core";

using Rest;
using Spector;
using Versioning;
using Azure.ResourceManager.Foundations;

@armProviderNamespace
@service
@versioned(Versions)
@doc("Test for ARM method level subscription ID parameter placement")
namespace Azure.ResourceManager.MethodSubscriptionId;

@doc("Azure API versions.")
enum Versions {
  @armCommonTypesVersion(CommonTypes.Versions.v5)
  @useDependency(Azure.Core.Versions.v1_0_Preview_2)
  @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
  @doc("Preview API version 2023-12-01-preview.")
  v2023_12_01_preview: "2023-12-01-preview",
}

// Scenario 1: Two subscription level resources with subscriptionId at method level for all operations
@scenarioDoc("""
  Test that subscriptionId parameter stays at method level for all operations on subscription-scoped resources.
  
  This scenario has two subscription-level resources (SubscriptionResource1 and SubscriptionResource2) where 
  the subscriptionId parameter is explicitly moved from client level to method level for all operations
  using @clientLocation decorator.
  
  Expected behavior:
  - Client should not have subscriptionId parameter in initialization
  - All operations (get, put, delete) should have subscriptionId as method-level parameter
  """)
@scenario
namespace TwoSubscriptionResourcesMethodLevel {
  @subscriptionResource
  @resource("subscriptionResource1s")
  model SubscriptionResource1 is ProxyResource<SubscriptionResource1Properties> {
    ...ResourceNameParameter<SubscriptionResource1>;
  }

  @doc("Properties of subscription resource 1.")
  model SubscriptionResource1Properties {
    @visibility(Lifecycle.Read)
    @doc("The status of the last operation.")
    provisioningState?: ResourceProvisioningState;

    @doc("The description of the resource.")
    description?: string;
  }

  @subscriptionResource
  @resource("subscriptionResource2s")
  model SubscriptionResource2 is ProxyResource<SubscriptionResource2Properties> {
    ...ResourceNameParameter<SubscriptionResource2>;
  }

  @doc("Properties of subscription resource 2.")
  model SubscriptionResource2Properties {
    @visibility(Lifecycle.Read)
    @doc("The status of the last operation.")
    provisioningState?: ResourceProvisioningState;

    @doc("The configuration value.")
    configValue?: string;
  }

  // Define base parameter models to enable subscriptionId parameter access
  model GetSubscriptionResource1BaseParameter
    is Azure.ResourceManager.Foundations.DefaultBaseParameters<SubscriptionResource1>;
  model PutSubscriptionResource1BaseParameter
    is Azure.ResourceManager.Foundations.DefaultBaseParameters<SubscriptionResource1>;
  model DeleteSubscriptionResource1BaseParameter
    is Azure.ResourceManager.Foundations.DefaultBaseParameters<SubscriptionResource1>;

  model GetSubscriptionResource2BaseParameter
    is Azure.ResourceManager.Foundations.DefaultBaseParameters<SubscriptionResource2>;
  model PutSubscriptionResource2BaseParameter
    is Azure.ResourceManager.Foundations.DefaultBaseParameters<SubscriptionResource2>;
  model DeleteSubscriptionResource2BaseParameter
    is Azure.ResourceManager.Foundations.DefaultBaseParameters<SubscriptionResource2>;

  @armResourceOperations
  interface SubscriptionResource1Operations {
    get is ArmResourceRead<
      SubscriptionResource1,
      BaseParameters = GetSubscriptionResource1BaseParameter
    >;
    put is ArmResourceCreateOrReplaceAsync<
      SubscriptionResource1,
      BaseParameters = PutSubscriptionResource1BaseParameter
    >;
    delete is ArmResourceDeleteWithoutOkAsync<
      SubscriptionResource1,
      BaseParameters = DeleteSubscriptionResource1BaseParameter
    >;
    list is ArmListBySubscription<SubscriptionResource1>;
  }

  @armResourceOperations
  interface SubscriptionResource2Operations {
    get is ArmResourceRead<
      SubscriptionResource2,
      BaseParameters = GetSubscriptionResource2BaseParameter
    >;
    put is ArmResourceCreateOrReplaceAsync<
      SubscriptionResource2,
      BaseParameters = PutSubscriptionResource2BaseParameter
    >;
    delete is ArmResourceDeleteWithoutOkAsync<
      SubscriptionResource2,
      BaseParameters = DeleteSubscriptionResource2BaseParameter
    >;
    list is ArmListBySubscription<SubscriptionResource2>;
  }
}

// Scenario 2: One subscription level resource (method-level subscriptionId) and one resource group level resource (client-level subscriptionId)
@scenarioDoc("""
  Test mixed parameter placement: subscription resource with method-level subscriptionId and resource group resource with client-level subscriptionId.
  
  This scenario has:
  1. One subscription-level resource (SubscriptionResource) with subscriptionId moved to method level
  2. One resource group-level resource (ResourceGroupResource) with subscriptionId staying at client level
  
  Expected behavior:
  - Client should have subscriptionId parameter in initialization (for ResourceGroupResource operations)
  - SubscriptionResource operations should have subscriptionId as method-level parameter
  - ResourceGroupResource operations should not have subscriptionId as method-level parameter (uses client-level)
  """)
@scenario
namespace MixedSubscriptionPlacement {
  @subscriptionResource
  @resource("subscriptionResources")
  model SubscriptionResource is ProxyResource<SubscriptionResourceProperties> {
    ...ResourceNameParameter<SubscriptionResource>;
  }

  @doc("Properties of subscription resource.")
  model SubscriptionResourceProperties {
    @visibility(Lifecycle.Read)
    @doc("The status of the last operation.")
    provisioningState?: ResourceProvisioningState;

    @doc("The subscription-scoped setting.")
    subscriptionSetting?: string;
  }

  @resource("resourceGroupResources")
  model ResourceGroupResource is TrackedResource<ResourceGroupResourceProperties> {
    ...ResourceNameParameter<ResourceGroupResource>;
  }

  @doc("Properties of resource group resource.")
  model ResourceGroupResourceProperties {
    @visibility(Lifecycle.Read)
    @doc("The status of the last operation.")
    provisioningState?: ResourceProvisioningState;

    @doc("The resource group-scoped setting.")
    resourceGroupSetting?: string;
  }

  // Define base parameter models only for subscription resource to enable subscriptionId parameter access
  model GetSubscriptionResourceBaseParameter is DefaultBaseParameters<SubscriptionResource>;
  model PutSubscriptionResourceBaseParameter is DefaultBaseParameters<SubscriptionResource>;
  model DeleteSubscriptionResourceBaseParameter is DefaultBaseParameters<SubscriptionResource>;

  @armResourceOperations
  interface SubscriptionResourceOperations {
    get is ArmResourceRead<
      SubscriptionResource,
      BaseParameters = GetSubscriptionResourceBaseParameter
    >;
    put is ArmResourceCreateOrReplaceAsync<
      SubscriptionResource,
      BaseParameters = PutSubscriptionResourceBaseParameter
    >;
    delete is ArmResourceDeleteWithoutOkAsync<
      SubscriptionResource,
      BaseParameters = DeleteSubscriptionResourceBaseParameter
    >;
    list is ArmListBySubscription<SubscriptionResource>;
  }

  @armResourceOperations
  interface ResourceGroupResourceOperations {
    get is ArmResourceRead<ResourceGroupResource>;
    put is ArmResourceCreateOrReplaceAsync<ResourceGroupResource>;
    delete is ArmResourceDeleteWithoutOkAsync<ResourceGroupResource>;
    listByResourceGroup is ArmResourceListByParent<ResourceGroupResource>;
    listBySubscription is ArmListBySubscription<ResourceGroupResource>;
  }
}
