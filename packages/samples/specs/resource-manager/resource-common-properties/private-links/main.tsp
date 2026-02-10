import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using Http;
using Rest;
using Versioning;
using Azure.ResourceManager;

@service(#{ title: "Microsoft.PrivateLinkTest" })
@versioned(Microsoft.PrivateLinkTest.Versions)
@armProviderNamespace
namespace Microsoft.PrivateLinkTest;

@doc("The PrivateLinkTest service versions.")
enum Versions {
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v4)
  @doc("The 2023-08-01-preview version.")
  `2023-08-01-preview`,

  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  @doc("The 2023-11-01-preview version.")
  `2023-11-01-preview`,
}

interface Operations extends Azure.ResourceManager.Operations {}

// Tracked resources
model TestTrackedResource is TrackedResource<TestTrackedProperties> {
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @doc("The name of the Tracked resource.")
  @key("trackedResourceName")
  @segment("trackedResources")
  @path
  name: string;
}

@armResourceOperations(TestTrackedResource)
interface TrackedOperations
  extends TrackedResourceOperations<TestTrackedResource, TestTrackedProperties> {}

@doc("rp-specific properties for the resource with all envelope properties")
model TestTrackedProperties {
  @doc("The status of the last operation performed on this resource.")
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;

  @visibility(Lifecycle.Create, Lifecycle.Read)
  @doc("Name of the resource")
  displayName?: string = "default";

  /** The private endpoints exposed by this resource */
  @visibility(Lifecycle.Read)
  endpoints?: PrivateEndpoint[];
}

model PrivateEndpoint is PrivateEndpointConnection;
alias PrivateEndpointOperations = PrivateEndpoints<PrivateEndpoint>;

/** Private connection operations */
@armResourceOperations(PrivateEndpointConnectionResource)
interface PrivateEndpointConnections {
  /** List existing private connections */
  listByTestTrackedResource is PrivateEndpointOperations.ListByParent<TestTrackedResource>;
  /** Get a specific private connection */
  get is PrivateEndpointOperations.Read<TestTrackedResource>;
  /** Create a Private endpoint connection */
  create is PrivateEndpointOperations.CreateOrReplaceSync<TestTrackedResource>;
  /** Delete the private endpoint connection */
  delete is PrivateEndpointOperations.DeleteAsync<TestTrackedResource>;
}

/** Private Links for TestRackedResource */
model PrivateLinkResource is PrivateLink;
alias PrivateLinkOps = PrivateLinks<PrivateLinkResource>;

/** Operations for private links on TestTrackedResource */
@armResourceOperations(PrivateLinkResource)
interface PrivateLinkOperations {
  /** list private links on the given resource */
  listByTestTrackedResource is PrivateLinkOps.ListByParent<TestTrackedResource>;
}
