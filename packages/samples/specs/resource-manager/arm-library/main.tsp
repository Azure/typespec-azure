import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";
import "./ref-library/int-templates.tsp";
import "./ref-library/op-templates.tsp";

using Http;
using Rest;
using Versioning;
using Azure.ResourceManager;

@service(#{ title: "Microsoft.EnvelopeTest" })
@useLibraryNamespace(Microsoft.InterfacesTest, Microsoft.OperationsTest)
@armProviderNamespace
@versioned(Versions)
namespace Microsoft.LibraryTest;

/** ARM Library API versions */
enum Versions {
  /** 2021-09-21-preview version */
  @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
  @useDependency(Azure.Core.Versions.v1_0_Preview_1)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  `2021-09-21-preview`,
}

interface Operations extends Azure.ResourceManager.Operations {}

model AllPropertiesResource is TrackedResource<AllPropertiesProperties> {
  @pattern("^[a-zA-Z0-9-]{3,24}$")
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
  @visibility(Lifecycle.Read)
  provisioningState?: SystemEnvelopeProvisioningState;

  @doc("Name of the resource")
  displayName?: string = "default";
}

@Azure.Core.lroStatus
@doc("Envelope provisioning state")
union SystemEnvelopeProvisioningState {
  string,
  ResourceProvisioningState,

  @doc("Working")
  Working: "Working",
}

@armResourceOperations
interface TrackedOperations extends Microsoft.InterfacesTest.TrackedOperations {}

@armResourceOperations
interface TrackedChildOperations extends Microsoft.InterfacesTest.TrackedChildOperations {}

@armResourceOperations
interface TenantOperations extends Microsoft.InterfacesTest.TenantOperations {}

@armResourceOperations
interface ExtensionOperations extends Microsoft.InterfacesTest.ExtensionOperations {}

@armResourceOperations
interface Tracked2Operations extends Microsoft.OperationsTest.Tracked2Operations {}
