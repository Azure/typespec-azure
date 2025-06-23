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
