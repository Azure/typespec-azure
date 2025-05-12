import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

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
}

interface Operations extends Azure.ResourceManager.Operations {}

/** Holder for private endpoint connections */
model PrivateEndpointConnectionResource is ProxyResource<PrivateEndpointConnectionProperties> {
  ...PrivateEndpointConnectionParameter;
}

/** Private connection operations */
@armResourceOperations(PrivateEndpointConnectionResource)
interface PrivateEndpointConnections {
  #suppress "deprecated" "PrivateEndpointConnectionListResultV5 validation"
  listByResourceGroup is ArmResourceListByParent<
    PrivateEndpointConnectionResource,
    Response = ArmResponse<Azure.ResourceManager.CommonTypes.PrivateEndpointConnectionListResultV5>
  >;
}

/** Private Links for TestRackedResource */
#suppress "@azure-tools/typespec-providerhub-controller/no-resource-operations" "Expected for private links"
model PrivateLinkResource is ProxyResource<PrivateLinkResourceProperties> {
  ...PrivateLinkResourceParameter;
}

/** Operations for private links on TestTrackedResource */
@armResourceOperations(PrivateLinkResource)
interface PrivateLinks {
  /** list private links on the given resource */
  #suppress "deprecated" "PrivateLinkResourceListResultV5 validation"
  listByLinkResult is ArmResourceListByParent<
    PrivateLinkResource,
    Response = ArmResponse<Azure.ResourceManager.CommonTypes.PrivateLinkResourceListResultV5>
  >;
}
