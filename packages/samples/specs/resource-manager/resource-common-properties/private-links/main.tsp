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
  @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v4)
  @doc("The 2023-08-01-preview version.")
  `2023-08-01-preview`,

  @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
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

/** Holder for private endpoint connections */
@parentResource(TestTrackedResource)
model PrivateEndpointConnectionResource is ProxyResource<PrivateEndpointConnectionProperties> {
  ...PrivateEndpointConnectionParameter;
}

/** Private connection operations */
@armResourceOperations(PrivateEndpointConnectionResource)
interface PrivateEndpointConnections {
  /** List existing private connections */
  listByTestTrackedResource is ArmResourceListByParent<PrivateEndpointConnectionResource>;
  /** Get a specific private connection */
  get is ArmResourceRead<PrivateEndpointConnectionResource>;
  /** Create a Private endpoint connection */
  create is ArmResourceCreateOrReplaceSync<PrivateEndpointConnectionResource>;
  /** Delete the private endpoint connection */
  delete is ArmResourceDeleteSync<PrivateEndpointConnectionResource>;

  #suppress "deprecated" "PrivateEndpointConnectionListResultV5 validation"
  @route("test/v5")
  listByResourceGroup is ArmResourceListByParent<
    PrivateEndpointConnectionResource,
    Response = ArmResponse<Azure.ResourceManager.CommonTypes.PrivateEndpointConnectionListResultV5>
  >;
}

/** Private Links for TestRackedResource */
#suppress "@azure-tools/typespec-providerhub-controller/no-resource-operations" "Expected for private links"
@parentResource(TestTrackedResource)
model PrivateLinkResource is ProxyResource<PrivateLinkResourceProperties> {
  ...PrivateLinkResourceParameter;
}

/** Operations for private links on TestTrackedResource */
@armResourceOperations(PrivateLinkResource)
interface PrivateLinks {
  /** list private links on the given resource */
  listByTestTrackedResource is ArmResourceListByParent<PrivateLinkResource>;

  #suppress "deprecated" "PrivateLinkResourceListResultV5 validation"
  @route("/test/v5")
  listByLinkResult is ArmResourceListByParent<
    PrivateLinkResource,
    Response = ArmResponse<Azure.ResourceManager.CommonTypes.PrivateLinkResourceListResultV5>
  >;
}
