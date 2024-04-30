using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using Azure.Core;
using Azure.ResourceManager.Foundations;
using Azure.ResourceManager.Private;

namespace Azure.ResourceManager;

/**
 * Spread this model into ARM resource models to specify resource name parameter for its operations. If `Resource` parameter
 * is specified, the resource name will be properly camel cased and pluralized for `@key` and `@segment`
 * automatically. You can also apply explicit override with `KeyName` and `SegmentName` template parameters.
 * @template Resource The ARM resource this name parameter is applying to.
 * @template KeyName Override default key name of the resource.
 * @template SegmentName Override default segment name of the resource.
 * @template NamePattern The RegEx pattern of the name. Default is `^[a-zA-Z0-9-]{3,24}$`.
 */
model ResourceNameParameter<
  Resource extends Foundations.Resource,
  KeyName extends valueof string = "",
  SegmentName extends valueof string = "",
  NamePattern extends valueof string = "^[a-zA-Z0-9-]{3,24}$"
> {
  @doc("The name of the {name}", Resource)
  @pattern(NamePattern)
  @defaultResourceKeySegmentName(Resource, KeyName, SegmentName)
  @path
  name: string;
}

//#region Standard Resource Operation Interfaces
/**
 * Concrete tracked resource types can be created by aliasing this type using a specific property type.
 *
 * See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)
 * @template Properties A model containing the provider-specific properties for this resource
 */
@doc("Concrete tracked resource types can be created by aliasing this type using a specific property type.")
@armResourceInternal(Properties)
@includeInapplicableMetadataInPayload(false)
model TrackedResource<Properties extends {}> extends Foundations.TrackedResource {
  @doc("The resource-specific properties for this resource.")
  @visibility("read", "create")
  @extension("x-ms-client-flatten", true)
  properties?: Properties;
}

/**
 * Concrete proxy resource types can be created by aliasing this type using a specific property type.
 *
 * See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)
 * @template Properties A model containing the provider-specific properties for this resource
 */
@doc("Concrete proxy resource types can be created by aliasing this type using a specific property type.")
@armResourceInternal(Properties)
@includeInapplicableMetadataInPayload(false)
model ProxyResource<Properties extends {}> extends Foundations.ProxyResource {
  @doc("The resource-specific properties for this resource.")
  @visibility("read", "create")
  @extension("x-ms-client-flatten", true)
  properties?: Properties;
}

/**
 * Concrete extension resource types can be created by aliasing this type using a specific property type.
 *
 * See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)
 * @template Properties A model containing the provider-specific properties for this resource
 */
@extensionResource
@doc("Concrete extension resource types can be created by aliasing this type using a specific property type.")
@armResourceInternal(Properties)
@includeInapplicableMetadataInPayload(false)
model ExtensionResource<Properties extends {}> extends Foundations.ProxyResource {
  @doc("The resource-specific properties for this resource.")
  @visibility("read", "create")
  @extension("x-ms-client-flatten", true)
  properties?: Properties;
}
//#region

//#region Standard extraction models

/**
 * Extracts the key (path) parameters from a resource and its parents
 * @template Resource The resource to extract properties from
 */
@copyResourceKeyParameters
model KeysOf<Resource> {}

/**
 * Extracts the key (path) parameters from the parent(s) of the given resource
 * @template Resource The resource to extract properties from
 */
@copyResourceKeyParameters("parent")
model ParentKeysOf<Resource> {}

/**
 * Model describing the provider namespace.
 * @template Resource The resource provided by the namespace.
 */
model ProviderNamespace<Resource extends {}> {
  @path
  @segment("providers")
  @assignProviderNameValue(Resource)
  @doc("The provider namespace for the resource.")
  provider: "Microsoft.ThisWillBeReplaced";
}
//#endregion

//#region Common Azure Resource Manager type definitions

/**
 * Use Azure.Core.armResourceIdentifier<AllowedResourceTypes>
 */
#deprecated "Use Azure.Core.armResourceIdentifier<AllowedResourceTypes> instead."
alias ResourceIdentifier<AllowedResourceTypes extends ArmResourceIdentifierAllowedResource[] = never> = Azure.Core.armResourceIdentifier<AllowedResourceTypes>;

#deprecated "Use ArmResourceIdentifierAllowedResource instead."
alias ResourceIdentifierAllowedResource = ArmResourceIdentifierAllowedResource;

/**
 * Standard terminal provisioning state of resource type. You can include in your
 * custom provision state to avoid duplication and ensure consistency
 *
 * @example
 *
 * ```typespec
 * union FooProvisioningState {
 *   ResourceProvisioningState,  // include standard provisioning states
 *   starting: "starting",
 *   started: "started",
 *   stopping: "stopping",
 *   stopped: "stopped",
 * }
 * ```
 */
@doc("The provisioning state of a resource type.")
@Azure.Core.lroStatus
union ResourceProvisioningState {
  @doc("Resource has been created.")
  Succeeded: "Succeeded",

  @doc("Resource creation failed.")
  Failed: "Failed",

  @doc("Resource creation was canceled.")
  Canceled: "Canceled",

  string,
}

/**
 * Standard resource provisioning state model. If you do not have any custom provisioning state,
 * you can spread this model directly into your resource property model.
 *
 * @example
 *
 * ```typespec
 * model FooProperties {
 *   // Only have standard Succeeded, Failed, Cancelled states
 *   ...DefaultProvisioningStateProperty,
 * }
 * ```
 */
@doc("Contains a default provisioningState property to be spread into resource property types")
model DefaultProvisioningStateProperty {
  @doc("The provisioning state of the resource.")
  @visibility("read")
  provisioningState?: ResourceProvisioningState;
}

/** The standard evenlop definition of ExtendedLocation.
 *
 * @example
 * ```typespec
 * model Employee is TrackedResource<EmployeeProperties> {
 * ...ResourceNameParameter<Employee>;
 * ...ExtendedLocationProperty;
 * }
 * ```
 */
model ExtendedLocationProperty {
  @visibility("read", "create")
  extendedLocation?: Foundations.ExtendedLocation;
}

/**
 * Standard Azure Resource Manager definition of ManagedServiceIdentity
 */
@doc("The managed service identities envelope.")
model ManagedServiceIdentity {
  @doc("The managed service identities assigned to this resource.")
  identity?: ManagedIdentityProperties;
}

/**
 * Standard Azure Resource Manager definition of ManagedServiceIdentity for services
 * that only support system-defined identities
 */
@doc("Managed identity for services that are constrained to system-assigned managed identities.")
model ManagedSystemAssignedIdentity {
  @doc("The managed service identities assigned to this resource.")
  identity?: ManagedSystemIdentityProperties;
}

/**
 * Model used only to spread in the standard `eTag` envelope property for a resource
 * @example
 *
 * ```typespec
 * model Foo is TrackedResource<FooProperties> {
 *   // Only have standard Succeeded, Failed, Cancelled states
 *   ...EntityTag;
 * }
 * ```
 */
@doc("The eTag property envelope.")
model EntityTag {
  @doc("If eTag is provided in the response body, it may also be provided as a header per the normal etag convention.  Entity tags are used for comparing two or more entities from the same requested resource. HTTP/1.1 uses entity tags in the etag (section 14.19), If-Match (section 14.24), If-None-Match (section 14.26), and If-Range (section 14.27) header fields.")
  @visibility("read")
  eTag?: string;
}

/**
 * Model used only to spread in the standard `kind` envelope property for a resource
 * @example
 *
 * ```typespec
 * model Foo is TrackedResource<FooProperties> {
 *   // Only have standard Succeeded, Failed, Cancelled states
 *   ...ResourceKind;
 * }
 * ```
 */
@doc("The resource kind property envelope.")
model ResourceKind {
  @doc("Metadata used by portal/tooling/etc to render different UX experiences for resources of the same type; e.g. ApiApps are a kind of Microsoft.Web/sites type.  If supported, the resource provider must validate and persist this value.")
  @pattern("^[-\\w\\._,\\(\\\\\\)]+$")
  @visibility("read", "create")
  kind?: string;
}

/**
 * Paged response containing resources
 * @template Resource The type of the values returned in the paged response (must be a resource)
 */
@doc("The response of a {name} list operation.", Resource)
@friendlyName("{name}ListResult", Resource)
model ResourceListResult<Resource extends Foundations.Resource> is Azure.Core.Page<Resource>;

/**
 * Model used only to spread in the standard `plan` envelope property for a resource
 * @example
 *
 * ```typespec
 * model Foo is TrackedResource<FooProperties> {
 *   // Only have standard Succeeded, Failed, Cancelled states
 *   ...ResourcePlan;
 * }
 * ```
 */
@doc("The resource plan property envelope.")
model ResourcePlan {
  @doc("Details of the resource plan.")
  plan?: Plan;
}

/**
 * Model used only to spread in the standard `sku` envelope property for a resource
 * @example
 *
 * ```typespec
 * model Foo is TrackedResource<FooProperties> {
 *   // Only have standard Succeeded, Failed, Cancelled states
 *   ...ResourceSku;
 * }
 * ```
 */
@doc("The SKU (Stock Keeping Unit) assigned to this resource.")
model ResourceSku {
  @doc("The SKU (Stock Keeping Unit) assigned to this resource.")
  sku?: Sku;
}

/**
 * Model used only to spread in the standard `managedBy` envelope property for a resource
 * @example
 *
 * ```typespec
 * model Foo is TrackedResource<FooProperties> {
 *   // Only have standard Succeeded, Failed, Cancelled states
 *   ...ManagedBy;
 * }
 * ```
 */
@doc("The managedBy property envelope.")
model ManagedBy {
  @doc("The fully qualified resource ID of the resource that manages this resource. Indicates if this resource is managed by another Azure resource. If this is present, complete mode deployment will not delete the resource if it is removed from the template since it is managed by another resource.")
  managedBy?: string;
}

//#endregion
