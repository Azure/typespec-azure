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
model TargetBaseParameters<
  Resource extends {},
  TargetNamespace extends string = "Microsoft.ThisWillBeReplaced"
> {
  ...ApiVersionParameter;

  // unless built-in, tenant or extension
  ...CommonTypes.SubscriptionIdParameter;

  // unless built-in tenant, subscription, location, or extension
  ...CommonTypes.ResourceGroupNameParameter;

  // unless built-in
  ...TargetProviderNamespace<Resource, TargetNamespace>;
}

model TargetParameters<
  Resource extends {},
  TargetNamespace extends string = "Microsoft.ThisWillBeReplaced"
> {
  ...TargetBaseParameters<Resource, TargetNamespace>;
  ...KeysOf<Resource>;
}

model ExtensionProviderNamespace<Resource extends {}> {
  @path
  @segment("providers")
  @assignProviderNameValue(Resource)
  @doc("The provider namespace for the resource.")
  extensionProvider: "Microsoft.ThisWillBeReplaced";
}

model TargetProviderNamespace<Resource extends {}, Type extends string> {
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
  @segment("providers")
  @doc("The provider namespace for the resource.")
  @assignProviderNameValue(Resource)
  provider: "Microsoft.ThisWillBeReplaced";
}

model ExtensionInstanceParameters<
  TargetResource extends {},
  TargetNamespace extends string,
  Resource extends {}
> {
  ...TargetParameters<TargetResource, TargetNamespace>;
  ...ExtensionProviderNamespace<Resource>;
  ...KeysOf<Resource>;
}

model ExtensionParentParameters<
  TargetResource extends {},
  TargetNamespace extends string,
  ExtensionResource extends {}
> {
  ...TargetParameters<TargetResource, TargetNamespace>;
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

@armVirtualResource(TargetNamespace)
@Http.Private.includeInapplicableMetadataInPayload(false)
model ExternalResource<
  TargetNamespace extends valueof string,
  ResourceType extends valueof string,
  ResourceParameterName extends valueof string
> {
  /** The name of the virtual machine */
  @visibility(Lifecycle.Read)
  @path
  @key(ResourceParameterName)
  @segment(ResourceType)
  name: string;
}

@builtInSubscriptionResource
model Subscription {}

@builtInResourceGroupResource
model ResourceGroup {}
