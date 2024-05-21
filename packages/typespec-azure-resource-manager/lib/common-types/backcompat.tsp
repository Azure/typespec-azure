namespace Azure.ResourceManager.Foundations;

#deprecated "Please use Foundations.Resource instead of Foundations.ArmResource"
alias ArmResource = Resource;

#deprecated "Please use Foundations.TrackedResource instead of Foundations.TrackedResourceBase"
alias TrackedResourceBase = TrackedResource;

#deprecated "Please use Foundations.ProxyResource instead of Foundations.ProxyResourceBase"
alias ProxyResourceBase = ProxyResource;

#deprecated "Please use Foundations.ProxyResource instead of Foundations.ExtensionResourceBase"
alias ExtensionResourceBase = ExtensionResource;

#deprecated "Please use Foundations.Sku instead of Foundations.ResourceSkuType"
alias ResourceSkuType = Sku;

#deprecated "Please use Foundations.Plan instead of Foundations.ResourcePlanType"
alias ResourcePlanType = Plan;

// NOTE: Keeping this in separate file to avoid naming conflict when generating Common-Type swaggers
/** The set of user assigned identities associated with the resource. The userAssignedIdentities
 * dictionary keys will be ARM resource ids in the form:
 * '/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/{identityName}. The dictionary values can be empty objects ({}) in requests.",
 */
alias UserAssignedIdentities = Record<UserAssignedIdentity>;
