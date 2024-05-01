import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@service({
  title: "Microsoft.EnvelopeTest",
})
@OpenAPI.info({
  version: "2021-09-21-preview",
})
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
@armProviderNamespace
namespace Microsoft.EnvelopeTest;

interface Operations extends Azure.ResourceManager.Operations {}

model AllPropertiesResource is TrackedResource<AllPropertiesProperties> {
  @doc("The name of the all properties resource.")
  @key("allPropertiesName")
  @segment("allProperties")
  @path
  name: string;

  ...EntityTagProperty;
  ...ManagedByProperty;
  ...ResourceKindProperty;
  ...ResourcePlanProperty;
  ...ResourceSkuProperty;
  ...ManagedServiceIdentityProperty;
}

@armResourceOperations
interface AllProperties
  extends TrackedResourceOperations<AllPropertiesResource, AllPropertiesProperties> {}

@doc("rp-specific properties for the resource with all envelope properties")
model AllPropertiesProperties {
  @doc("The status of the last operation performed on this resource.")
  provisioningState: EnvelopeProvisioningState;

  @doc("Name of the resource")
  displayName?: string = "default";
}

@doc("rp-specific properties for the resource using system-only Managed Identity")
model SystemOnlyProperties {
  @doc("The status of the last operation performed on this resource.")
  provisioningState: EnvelopeProvisioningState;
}

model SystemOnlyResource is TrackedResource<SystemOnlyProperties> {
  @doc("The name of the all properties resource.")
  @key("systemOnlyPropertiesName")
  @segment("systems")
  @path
  name: string;

  ...ManagedSystemAssignedIdentity;
}

@armResourceOperations
interface SystemsOnlyResources
  extends TrackedResourceOperations<SystemOnlyResource, SystemOnlyProperties> {}

@Azure.Core.lroStatus
@doc("Envelope provisioning state")
union EnvelopeProvisioningState {
  string,
  ResourceProvisioningState,

  @doc("Working")
  Working: "Working",
}
