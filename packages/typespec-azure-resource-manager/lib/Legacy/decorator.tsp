using TypeSpec.Reflection;

namespace Azure.ResourceManager.Legacy;

/**
 * This decorator is used on resources that do not satisfy the definition of a resource
 * but need to be identified as such.
 */
extern dec customAzureResource(target: Model);
