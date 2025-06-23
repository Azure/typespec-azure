namespace Azure.ResourceManager.Extension;

using Http;
using Rest;
using Azure.ResourceManager.Private;
using Azure.ResourceManager.Extension.Private;
using Azure.ResourceManager.CommonTypes;

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
@doc("The default scope parameter type.")
@builtInResource
model ScopeParameter {
  @path(#{ allowReserved: true })
  @key
  @doc("The fully qualified Azure Resource manager identifier of the resource.")
  scope: string;
}
/**
 * Base parameters for a resource.
 * @template Resource The type of the resource.
 */
@resourceBaseParametersOf(Resource)
model TargetBaseParameters<Resource extends {}> {
  ...ApiVersionParameter;

  // unless built-in, tenant or extension
  ...CommonTypes.SubscriptionIdParameter;

  // unless built-in tenant, subscription, location, or extension
  ...CommonTypes.ResourceGroupNameParameter;

  // unless built-in
  ...TargetProviderNamespace<Resource>;
}

model TargetParameters<Resource extends {}> {
  ...TargetBaseParameters<Resource>;
  ...KeysOf<Resource>;
}

model ExtensionProviderNamespace<Resource extends {}> {
  @path
  @segment("providers")
  @key
  @assignProviderNameValue(Resource)
  @doc("The provider namespace for the resource.")
  extensionProvider: "Microsoft.ThisWillBeReplaced";
}

model TargetProviderNamespace<Resource extends {}> {
  @resourceParameterBaseFor(
    [
      ResourceHome.Extension,
      ResourceHome.Location,
      ResourceHome.ResourceGroup,
      ResourceHome.Subscription,
      ResourceHome.Tenant
    ]
  )
  @path
  @segment("provider")
  @key
  @doc("The provider namespace for the resource.")
  @assignProviderNameValue(Resource)
  provider: "Microsoft.ThisWillBeReplaced";
}

model ExtensionInstanceParameters<TargetResource extends {}, Resource extends {}> {
  ...TargetParameters<TargetResource>;
  ...ExtensionProviderNamespace<Resource>;
  ...KeysOf<Resource>;
}

model ExtensionParentParameters<TargetResource extends {}, ExtensionResource extends {}> {
  ...TargetParameters<TargetResource>;
  ...ExtensionProviderNamespace<ExtensionResource>;
  ...ParentKeysOf<ExtensionResource>;
}

@builtInResource
model Tenant {}
/** Represents a management group */
@tenantResource
@armVirtualResource("Microsoft.Management")
model ManagementGroup {
  @path
  @minLength(1)
  @segment("managementGroups")
  @key("managementGroupName")
  @doc("The management group ID.")
  name: string;
}

alias Subscription = CommonTypes.Extension.SubscriptionTarget;
alias ResourceGroup = CommonTypes.Extension.ResourceGroupTarget;
