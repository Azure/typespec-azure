using Http;
using Rest;
using Azure.Core;
using Azure.ResourceManager.Private;

namespace Azure.ResourceManager.Extension;

/** Represents an extension resource group */
@parentResource(Subscription)
@Private.builtInResource
model ResourceGroup is CommonTypes.ResourceGroupNameParameter;

@Private.builtInResource
model Subscription is CommonTypes.SubscriptionIdParameter;

/** Represents a management group */
@tenantResource
@armVirtualResource("Microsoft.Management")
model ManagementGroup {
  @path
  @minLength(1)
  @segment("managementGroups")
  @key
  @doc("The management group ID.")
  managementGroupName: string;
}
