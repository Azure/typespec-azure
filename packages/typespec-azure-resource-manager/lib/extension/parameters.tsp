using Http;
using Rest;
using Azure.Core;
using Azure.ResourceManager;
using Azure.ResourceManager.Private;
using Azure.ResourceManager.Foundations;
using Azure.ResourceManager.Extension.Private;

namespace Azure.ResourceManager.Extension;

/**
 * The default scope parameter type.
 *
 * @example
 * ```typespec
 * model Employee {
 *  ...ResourceUriParameter;
 * }
 * ```
 */
@doc("The default resourceUri parameter type.")
@builtInResource
model ScopeParameter<Type extends string = string> {
  @path(#{ allowReserved: true })
  @doc("The fully qualified Azure Resource manager identifier of the resource.")
  scope: Type;
}
/**
 * Base parameters for a resource.
 * @template Resource The type of the resource.
 */
@resourceBaseParametersOf(Resource)
model TargetBaseParameters<Resource extends {}> {
  ...ApiVersionParameter;

  // unless tenant or extension
  ...CommonTypes.SubscriptionIdParameter;

  // unless tenant, subscription, location, or extension
  ...CommonTypes.ResourceGroupNameParameter;
}

model TargetParameters<Resource extends {}> {
  ...TargetBaseParameters<Resource>;
  ...ProviderNamespace<Resource>;
  ...KeysOf<Resource>;
}

model ExtensionProviderNamespace<ExtensionResource extends {}> {
  @path
  @segment("providers")
  @key
  @assignProviderNameValue(ExtensionResource)
  @doc("The provider namespace for the resource.")
  extensionProvider: "Microsoft.ThisWillBeReplaced";
}

model ExtensionInstanceParameters<TargetResource extends {}, ExtensionResource extends {}> {
  ...TargetParameters<TargetResource>;
  ...ExtensionProviderNamespace<ExtensionResource>;
  ...KeysOf<ExtensionResource>;
}

model ExtensionParentParameters<TargetResource extends {}, ExtensionResource extends {}> {
  ...TargetParameters<TargetResource>;
  ...ExtensionProviderNamespace<ExtensionResource>;
  ...ParentKeysOf<ExtensionResource>;
}

alias ManagementGroupResource = CommonTypes.Extension.ManagementGroup;
alias Subscription = CommonTypes.Extension.SubscriptionTarget;
alias ResourceGroup = CommonTypes.Extension.ResourceGroupTarget;
