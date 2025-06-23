using Http;
using Rest;
using Azure.Core;
using Azure.ResourceManager.Private;
using Azure.ResourceManager.Extension.Private;

namespace Azure.ResourceManager.CommonTypes.Extension;

/** Represents an extension resource group */
@parentResource(SubscriptionTarget)
@builtInResource
model ResourceGroupTarget is ResourceGroupParameter;

@builtInResource
model SubscriptionTarget is SubscriptionIdParameter;

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
