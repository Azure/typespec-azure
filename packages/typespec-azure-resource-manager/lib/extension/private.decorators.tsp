using Http;
using Rest;
using Azure.Core;
using Reflection;

namespace Azure.ResourceManager.Extension.Private;

/**
 * `@builtInResource` marks a model as built-in to Azure ResourceManager
 *
 * @param target - The model that is marked as built-in.
 */
extern dec builtInResource(target: Model);
