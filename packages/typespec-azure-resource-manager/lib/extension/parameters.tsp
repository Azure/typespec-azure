namespace Azure.ResourceManager.Extension;

using Http;
using Rest;
using Azure.ResourceManager.Private;
using Azure.ResourceManager.Extension.Private;
using Azure.ResourceManager.CommonTypes;

/**
 * The default scope parameter for an extension resource.
 *
 * @example
 * ```typespec
 * model Employee {
 *  ...ResourceUriParameter;
 * }
 * ```
 */
@builtInResource
model ScopeParameter {
  @path(#{ allowReserved: true })
  @key
  @doc("The fully qualified Azure Resource manager identifier of the resource.")
  scope: string;
}

/**
 * Base parameters for an extension target.
 * @template Resource The resource model for an extension target (usually Extension.Tenant, Extension.Subscription, Extension.ResourceGroup, Extension.Scope, Extension.ManagementGroup or an external resource).
 *
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

/** The path parameters for a target resource for an extension
 * @template Resource The resource model for an extension target (usually Extension.Tenant, Extension.Subscription, Extension.ResourceGroup, Extension.Scope, Extension.ManagementGroup or an external resource).
 */
model TargetParameters<Resource extends {}> {
  ...TargetBaseParameters<Resource>;
  ...KeysOf<Resource>;
}

/** The provider namespace for an extension resource
 * @template Resource The extension resource model
 */
model ExtensionProviderNamespace<Resource extends {}> {
  @path
  @segment("providers")
  @assignProviderNameValue(Resource)
  @doc("The provider namespace for the resource.")
  extensionProvider: "Microsoft.ThisWillBeReplaced";
}

/** The provider namespace (if any) for a target resource for an extension
 * @template Resource The resource model for an extension target (usually Extension.Tenant, Extension.Subscription, Extension.ResourceGroup, Extension.Scope, Extension.ManagementGroup or an external resource)
 */
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
  @segment("providers")
  @doc("The provider namespace for the resource.")
  @assignProviderNameValue(Resource)
  provider: "Microsoft.ThisWillBeReplaced";
}

/** The path parameters for an extension resource at the given target
 * @template TargetResource The target of the extension resource (Extension.Tenant, Extension.Subscription, Extension.ResourceGroup, Extension.Scope, Extension.ManagementGroup or another resource).
 * @template Resource The extension resource.
 */
model ExtensionInstanceParameters<TargetResource extends {}, Resource extends {}> {
  ...TargetParameters<TargetResource>;
  ...ExtensionProviderNamespace<Resource>;
  ...KeysOf<Resource>;
}

/** The path parameters for a collection of extension resources at the given target
 * @template TargetResource The target of the extension resource (Extension.Tenant, Extension.Subscription, Extension.ResourceGroup, Extension.Scope, Extension.ManagementGroup or another resource).
 * @template ExtensionResource The extension resource.
 */
model ExtensionParentParameters<TargetResource extends {}, ExtensionResource extends {}> {
  ...TargetParameters<TargetResource>;
  ...ExtensionProviderNamespace<ExtensionResource>;
  ...ParentKeysOf<ExtensionResource>;
}

/** A tenant target for the extension resource */
@builtInResource
model Tenant {}

/** A management group
 * @template ParameterName The name of the 'name' parameter of the management group (usually managementGroupName or managementGroupId).
 */
@tenantResource
@armVirtualResource("Microsoft.Management")
model ManagementGroup<ParameterName extends valueof string = "managementGroupName"> {
  @path
  @minLength(1)
  @segment("managementGroups")
  @key(ParameterName)
  @doc("The management group ID.")
  name: string;
}

/** An external resource target, used when an extension targets a resource from another provider namespace
 * @template TargetNamespace The provider namespace for the external resource.
 * @template ResourceType The type of the external resource.
 * @template ResourceParameterName The name of the 'name' parameter of the external resource.
 *
 * @example
 * ```typespec
 * alias VirtualMachine = ExternalResource<"Microsoft.Compute", "virtualMachines", "vmName">;
 *
 * ```
 *
 * @example
 * ```typespec
 * alias Scaleset = Extension.ExternalResource<
 *   "Microsoft.Compute",
 *   "virtualMachineScaleSets",
 *   "scaleSetName"
 * >;
 *
 * @parentResource(Scaleset)
 * model VirtualMachineScaleSetVm {
 *  @visibility(Lifecycle.Read)
 *  @path
 *  @segment("virtualMachineScaleSetVms")
 *  @key("scaleSetVmName")
 *  @pattern("^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,80}$")
 *  @doc("Name of the scaleset VM")
 *  name: string;
 * }
 *
 * ```
 */
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

/** A subscription target for an extension resource */
@builtInSubscriptionResource
model Subscription {}

/** A resource group target for an extension resource */
@builtInResourceGroupResource
model ResourceGroup {}
