using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using Azure.ResourceManager.Foundations;
using Azure.ResourceManager.Private;

namespace Azure.ResourceManager;

//#region Standard Resource Operation Interfaces
/**
 * Concrete tracked resource types can be created by aliasing this type using a specific property type.
 *
 * See more details on [different ARM resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)
 * @template TProperties A model containing the provider-specific properties for this resource
 */
@doc("Concrete tracked resource types can be created by aliasing this type using a specific property type.")
@armResourceInternal(TProperties)
@includeInapplicableMetadataInPayload(false)
model TrackedResource<TProperties extends {}> extends TrackedResourceBase {
  @doc("The resource-specific properties for this resource.")
  @visibility("read", "create")
  @extension("x-ms-client-flatten", true)
  properties?: TProperties;
}

/**
 * Concrete proxy resource types can be created by aliasing this type using a specific property type.
 *
 * See more details on [different ARM resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)
 * @template TProperties A model containing the provider-specific properties for this resource
 */
@doc("Concrete proxy resource types can be created by aliasing this type using a specific property type.")
@armResourceInternal(TProperties)
@includeInapplicableMetadataInPayload(false)
model ProxyResource<TProperties extends {}> extends ProxyResourceBase {
  @doc("The resource-specific properties for this resource.")
  @visibility("read", "create")
  @extension("x-ms-client-flatten", true)
  properties?: TProperties;
}

/**
 * Concrete extension resource types can be created by aliasing this type using a specific property type.
 *
 * See more details on [different ARM resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)
 * @template TProperties A model containing the provider-specific properties for this resource
 */
@extensionResource
@doc("Concrete extension resource types can be created by aliasing this type using a specific property type.")
@armResourceInternal(TProperties)
@includeInapplicableMetadataInPayload(false)
model ExtensionResource<TProperties extends {}> extends ExtensionResourceBase {
  @doc("The resource-specific properties for this resource.")
  @visibility("read", "create")
  @extension("x-ms-client-flatten", true)
  properties?: TProperties;
}
//#region

//#region Standard extraction models

/**
 * Extracts the key (path) parameters from a resource and its parents
 * @template TResource The resource to extract properties from
 */
@copyResourceKeyParameters
model KeysOf<TResource> {}

/**
 * Extracts the key (path) parameters from the parent(s) of the given resource
 * @template TResource The resource to extract properties from
 */
@copyResourceKeyParameters("parent")
model ParentKeysOf<TResource> {}

/**
 * Model describing the provider namespace.
 * @template TResource The resource provided by the namespace.
 */
model ProviderNamespace<TResource extends {}> {
  @path
  @segment("providers")
  @assignProviderNameValue(TResource)
  @doc("The provider namespace for the resource.")
  provider: "Microsoft.ThisWillBeReplaced";
}
//#endregion

//#region Common ARM type definitions

/**
 * A type definition that refers the id to an ARM resource.
 *
 * Sample usage:
 *   otherArmId: ResourceIdentifier;
 *   networkId: ResourceIdentifier<[{type:"\\Microsoft.Network\\vnet"}]>
 *   vmIds: ResourceIdentifier<[{type:"\\Microsoft.Compute\\vm", scopes["*"]}]>
 * @template T An array of allowed resource types for the resource reference
 */
@doc("A type definition that refers the id to an ARM resource.")
@format("arm-id")
@OpenAPI.extension(
  "x-ms-arm-id-details",
  {
    allowedResources: T,
  }
)
scalar ResourceIdentifier<T extends ResourceIdentifierAllowedResource[] = []> extends string;

/**
 * Used in ResourceIdentifier definition to represent a particular type of ARM resource, enabling constraints based on resource type.
 * See [link](https://github.com/Azure/autorest/tree/main/docs/extensions#schema)
 */
@doc("Optional definition represents a particular type of ARM resource which can be referred to by a ResourceIdentifier.")
model ResourceIdentifierAllowedResource {
  @doc("The type of resource that is being referred to. For example Microsoft.Network/virtualNetworks or Microsoft.Network/virtualNetworks/subnets. See Example Types for more examples.")
  type: string;

  @doc("""
    An array of scopes. If not specified, the default scope is ["ResourceGroup"].
    See [Allowed Scopes](https://github.com/Azure/autorest/tree/main/docs/extensions#allowed-scopes). 
    """)
  scopes?: string[] = [];
}

/**
 * Standard terminal provisioning state of resource type. You can spread into your
 * custom provision state to avoid duplication and ensure consistency
 *
 * @example
 *
 * ```typespec
 * enum FooProvisioningState {
 *   ...ResourceProvisioningState,  // include standard provisioning states
 *   starting,
 *   started,
 *   stopping,
 *   stopped,
 * }
 * ```
 */
@doc("The provisioning state of a resource type.")
@Azure.Core.lroStatus
enum ResourceProvisioningState {
  @doc("Resource has been created.")
  Succeeded,

  @doc("Resource creation failed.")
  Failed,

  @doc("Resource creation was canceled.")
  Canceled,
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
  provisioningState: ResourceProvisioningState;
}

/**
 * Standard ARM definition of ManagedServiceIdentity
 */
@doc("The managed service identities envelope.")
model ManagedServiceIdentity {
  @doc("The managed service identities assigned to this resource.")
  identity?: ManagedIdentityProperties;
}

/**
 * Standard ARM definition of ManagedServiceIdentity for services
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
 * @template TResource The type of the values returned in the paged response (must be a resource)
 */
@doc("The response of a {name} list operation.", TResource)
@friendlyName("{name}ListResult", TResource)
model ResourceListResult<TResource extends ArmResource> is Azure.Core.Page<TResource>;

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
  plan?: ResourcePlanType;
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
  sku?: ResourceSkuType;
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
