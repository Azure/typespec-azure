using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using Autorest;
using Azure.ResourceManager.Foundations;
using Azure.ResourceManager.Private;

namespace Azure.ResourceManager;

/**
 * This is the interface that implements the standard ARM operation that returns
 * all supported RP operations. You should have exactly one declaration for each
 * ARM service. It implements
 *   GET "/providers/Microsoft.ContosoProviderHub/operations"
 */
interface Operations {
  @tag("Operations")
  @autoRoute
  @armUpdateProviderNamespace
  @doc("List the operations for the provider")
  @segment("operations")
  @get
  list(
    ...ApiVersionParameter,

    @path
    @segment("providers")
    @doc("The provider namespace (this parameter will not show up in operations).")
    provider: "Microsoft.ThisWillBeReplaced",
  ): ArmResponse<OperationListResult> | ErrorResponse;
}

/**
 * @deprecated Use Azure.ResourceManager.TrackedResourceOperations instead
 * A composite interface for resources that include `ResourceInstanceOperations<TResource, TProperties>`
 * and `ResourceCollectionOperations<TResource>`. It includes: `GET`, `PUT`, `PATCH`, `DELETE`, ListByParent,
 * ListBySubscription operations. The actual route depends on the resource model.
 * This is the most common API pattern for Tracked Resources to use.
 * @template TResource the ArmResource that provides these operations
 * @template TProperties RP-specific property bag for the resource
 * @template TBaseParameters The http parameters that are part of the request
 *
 */
#deprecated "Use Azure.ResourceManager.TrackedResourceOperations instead"
interface ResourceOperations<
  TResource extends ArmResource,
  TProperties extends TypeSpec.Reflection.Model,
  TBaseParameters = BaseParameters<TResource>
> extends TrackedResourceOperations<TResource, TProperties, TBaseParameters> {}

/**
 * A composite interface for resources that include `ResourceInstanceOperations<TResource, TProperties>`
 * and `ResourceCollectionOperations<TResource>`. It includes: `GET`, `PUT`, `PATCH`, `DELETE`, ListByParent,
 * ListBySubscription operations. The actual route depends on the resource model.
 * This is the most common API pattern for Tracked Resources to use.
 * @template TResource the ArmResource that provides these operations
 * @template TProperties RP-specific property bag for the resource
 * @template TBaseParameters The http parameters that are part of the request
 *
 */
interface TrackedResourceOperations<
  TResource extends ArmResource,
  TProperties extends TypeSpec.Reflection.Model,
  TBaseParameters = BaseParameters<TResource>
>
  extends ResourceInstanceOperations<TResource, TProperties, TBaseParameters>,
    ResourceCollectionOperations<TResource, TBaseParameters> {}

/**
 * A composite interface for Proxy resources that include `ResourceInstanceOperations<TResource, TProperties>`
 * and `ResourceListByParent<TResource>`. It includes: `GET`, `PUT`, `PATCH`, `DELETE`, ListByParent operations.
 *
 * The actual route depends on the resource model but would have started with
 *   `/subscriptions/{id}/resourcegroups/{rg}/providers/Microsoft.XXX/...`
 *
 * This is the most common API pattern for Proxy Resources to use.
 * @template TResource the ArmResource that provides these operations
 * @template TBaseParameters The http parameters that are part of the request
 */
interface ProxyResourceOperations<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>
>
  extends ResourceRead<TResource, TBaseParameters>,
    ResourceCreate<TResource, TBaseParameters>,
    ResourceDelete<TResource, TBaseParameters>,
    ResourceListByParent<TResource, TBaseParameters> {}

/**
 * A composite interface for Tenant resources that include `ResourceInstanceOperations<TResource, TProperties>`
 * and `ResourceListByParent<TResource>`. It includes: `GET`, `PUT`, `PATCH`, `DELETE`, ListByParent operations.
 *
 * The routes are always start at root level:
 *   `/providers/Microsoft.XXX/...`
 *
 * This is the most common API pattern for Tenant Resources to use.
 * @template TResource the ArmResource that provides these operations
 * @template TProperties RP-specific property bag for the resource
 */
interface TenantResourceOperations<
  TResource extends ArmResource,
  TProperties extends TypeSpec.Reflection.Model
>
  extends TenantResourceRead<TResource>,
    TenantResourceCreate<TResource>,
    TenantResourceUpdate<TResource, TProperties>,
    TenantResourceDelete<TResource>,
    TenantResourceListByParent<TResource> {}

/**
 * A composite interface for resources that have CRUD operations.
 * @template TResource The ArmResource that provides these operations
 * @template TProperties RP-specific property bag for the resource
 * @template TBaseParameters The http parameters that are part of the request
 * @template TPatchModel The model used for PATCH operations
 */
interface ResourceInstanceOperations<
  TResource extends ArmResource,
  TProperties extends TypeSpec.Reflection.Model,
  TBaseParameters = BaseParameters<TResource>,
  TPatchModel = ResourceUpdateModel<TResource, TProperties>
>
  extends ResourceRead<TResource, TBaseParameters>,
    ResourceCreate<TResource, TBaseParameters>,
    ResourceUpdate<TResource, TProperties, TBaseParameters>,
    ResourceDelete<TResource, TBaseParameters> {}

/**
 * A composite interface for resource collections.
 * @template TResource The ArmResource that provides these operations
 * @template TBaseParameters The http parameters that are part of the request
 */
interface ResourceCollectionOperations<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>
> extends ResourceListByParent<TResource, TBaseParameters>, ResourceListBySubscription<TResource> {}

/**
 * An interface for resources with can be listed by subscription.
 * @template TResource The ArmResource that provides these operations
 */
interface ResourceListBySubscription<TResource extends ArmResource> {
  /**
   * @dev List resources by subscription.
   * @template TResource The ArmResource to list.
   */
  listBySubscription is ArmListBySubscription<TResource>;
}

/**
 * An interface for resources which can be listed by parent.
 * @template TResource The ArmResource that provides these operations
 * @template TBaseParameters The http parameters that are part of the request
 * @template TParentName The name of the parent resource
 * @template TParentFriendlyName The friendly name of the parent resource
 */
interface ResourceListByParent<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>,
  TParentName extends valueof string = "",
  TParentFriendlyName extends valueof string = ""
> {
  /**
   * @dev List resources by parent.
   * @template TResource The ArmResource to list.
   * @template TBaseParameters The http parameters that are part of the request
   * @template TParentName The name of the parent resource
   * @template TParentFriendlyName The friendly name of the parent resource
   */
  listByParent is ArmResourceListByParent<
    TResource,
    TBaseParameters,
    TParentName,
    TParentFriendlyName
  >;
}

/**
 * A composite interface for resources that include a GET operation.
 * @template TResource The ArmResource that provides these operations
 * @template TBaseParameters The http parameters that are part of the request
 */
interface ResourceRead<TResource extends ArmResource, TBaseParameters = BaseParameters<TResource>> {
  /**
   * @dev Retrieve a resource.
   * @template TResource The ArmResource to retrieve.
   * @template TBaseParameters The http parameters that are part of the request
   */
  get is ArmResourceRead<TResource, TBaseParameters>;
}

/**
 * A composite interface for resources that include a synchronous create or update operation.
 * @template TResource The ArmResource that provides these operations
 * @template TBaseParameters The http parameters that are part of the request
 */
interface ResourceCreateSync<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>
> {
  /**
   * @dev Create or update a resource using the synchronous call pattern.
   * @template TResource The ArmResource to create or update.
   * @template TBaseParameters The http parameters that are part of the request
   */
  createOrUpdate is ArmResourceCreateOrUpdateSync<TResource, TBaseParameters>;
}

/**
 * A composite interface for resources that include a long-running create or update operation.
 * @template TResource The ArmResource that provides these operations
 * @template TBaseParameters The http parameters that are part of the request
 */
interface ResourceCreateAsync<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>
> {
  /**
   * @dev Create or update a resource using the asynchronous call pattern.
   * @template TResource The ArmResource to create or update.
   * @template TBaseParameters The http parameters that are part of the request
   */
  createOrUpdate is ArmResourceCreateOrUpdateAsync<TResource, TBaseParameters>;
}

/**
 * @dev A composite interface for resources that include a long-running delete operation.
 *      DEPRECATED: Use ResourceDeleteWithoutOkAsync instead
 * @template TResource The ArmResource that provides these operations
 * @template TBaseParameters The http parameters that are part of the request
 */
@doc("Delete a resource using the asynchronous call pattern")
interface ResourceDeleteAsync<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>
> {
  /**
   * @dev Delete a resource using the asynchronous call pattern.
   * @template TResource The ArmResource to delete.
   * @template TBaseParameters The http parameters that are part of the request
   */
  delete is ArmResourceDeleteAsync<TResource, TBaseParameters>;
}

/**
 * @dev A composite interface for resources that include a synchronous delete operation.
 * @template TResource The ArmResource that provides these operations
 * @template TBaseParameters The http parameters that are part of the request
 */
@doc("Delete a resource using the asynchronous call pattern")
interface ResourceDeleteWithoutOkAsync<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>
> {
  /**
   * @dev Delete a resource using the asynchronous call pattern.
   * @template TResource The ArmResource to delete.
   * @template TBaseParameters The http parameters that are part of the request
   */
  delete is ArmResourceDeleteWithoutOkAsync<TResource, TBaseParameters>;
}

/**
 * A composite interface for resources that include a synchronous delete operation.
 * @template TResource The ArmResource that provides these operations
 * @template TBaseParameters The http parameters that are part of the request
 */
@doc("Delete a resource")
interface ResourceDeleteSync<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>
> {
  /**
   * @dev Delete a resource using the synchronous call pattern.
   * @template TResource The ArmResource to delete.
   * @template TBaseParameters The http parameters that are part of the request
   */
  delete is ArmResourceDeleteSync<TResource, TBaseParameters>;
}

/**
 * @dev A composite interface for resources that include a long-running update operation.
 * @template TResource The ArmResource that provides these operations
 * @template TProperties RP-specific property bag for the resource
 * @template TBaseParameters The http parameters that are part of the request
 */
@doc("Asynchronous resource update")
interface ResourceUpdateAsync<
  TResource extends ArmResource,
  TProperties extends TypeSpec.Reflection.Model,
  TBaseParameters = BaseParameters<TResource>
> {
  /**
   * @dev Update a resource using the asynchronous call pattern.
   * @template TResource The ArmResource to update.
   * @template TProperties RP-specific property bag for the resource
   * @template TBaseParameters The http parameters that are part of the request
   */
  update is ArmCustomPatchAsync<
    TResource,
    ResourceUpdateModel<TResource, TProperties>,
    TBaseParameters
  >;
}

/**
 * A composite interface for resources that include a synchronous update operation.
 * @template TResource The ArmResource that provides these operations
 * @template TProperties RP-specific property bag for the resource
 * @template TBaseParameters The http parameters that are part of the request
 */
@doc("Synchronous resource update")
interface ResourceUpdateSync<
  TResource extends ArmResource,
  TProperties extends TypeSpec.Reflection.Model,
  TBaseParameters = BaseParameters<TResource>
> {
  /**
   * @dev Update a resource using the synchronous call pattern.
   * @template TResource The ArmResource to update.
   * @template TProperties RP-specific property bag for the resource
   * @template TBaseParameters The http parameters that are part of the request
   */
  update is ArmCustomPatchSync<
    TResource,
    ResourceUpdateModel<TResource, TProperties>,
    TBaseParameters
  >;
}

/**
 * A composite interface for resources that includes CRUD operations.
 * @template TResource The ArmResource that provides these operations
 * @template TProperties RP-specific property bag for the resource
 */
interface ExtensionResourceInstanceOperations<
  TResource extends ArmResource,
  TProperties extends TypeSpec.Reflection.Model
>
  extends ExtensionResourceRead<TResource>,
    ExtensionResourceCreate<TResource>,
    ExtensionResourceUpdate<TResource, TProperties>,
    ExtensionResourceDelete<TResource> {}

/**
 * A composite interface for resource collections that include a paginated list operation.
 * @template TResource The ArmResource that provides these operations
 */
interface ExtensionResourceCollectionOperations<TResource extends ArmResource>
  extends ExtensionResourceList<TResource> {}

/**
 * A composite interface for resources that include CRUD and list operations.
 * @template TResource The ArmResource that provides these operations
 * @template TProperties RP-specific property bag for the resource
 */
interface ExtensionResourceOperations<
  TResource extends ArmResource,
  TProperties extends TypeSpec.Reflection.Model
>
  extends ExtensionResourceInstanceOperations<TResource, TProperties>,
    ExtensionResourceCollectionOperations<TResource> {}

alias ResourceCreate<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>
> = ResourceCreateAsync<TResource, TBaseParameters>;

alias ResourceUpdate<
  TResource extends ArmResource,
  TProperties extends TypeSpec.Reflection.Model,
  TBaseParameters = BaseParameters<TResource>
> = ResourceUpdateSync<TResource, TProperties, TBaseParameters>;

alias ResourceDelete<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>
> = ResourceDeleteAsync<TResource, TBaseParameters>;

alias ProxyResourceUpdate<
  TResource extends ArmResource,
  TProperties extends TypeSpec.Reflection.Model
> = ResourceUpdate<TResource, TProperties>;

alias ExtensionResourceRead<TResource extends ArmResource> = ResourceRead<
  TResource,
  ExtensionBaseParameters
>;

alias ExtensionResourceCreate<TResource extends ArmResource> = ResourceCreate<
  TResource,
  ExtensionBaseParameters
>;

alias ExtensionResourceUpdate<
  TResource extends ArmResource,
  TProperties extends TypeSpec.Reflection.Model
> = ResourceUpdate<TResource, TProperties, ExtensionBaseParameters>;

alias ExtensionResourceDelete<TResource extends ArmResource> = ResourceDelete<
  TResource,
  ExtensionBaseParameters
>;

alias ExtensionResourceList<TResource extends ArmResource> = ResourceListByParent<
  TResource,
  ExtensionBaseParameters,
  "Extension",
  "parent"
>;

alias TenantResourceRead<TResource extends ArmResource> = ResourceRead<
  TResource,
  TenantBaseParameters
>;

alias TenantResourceCreate<TResource extends ArmResource> = ResourceCreateAsync<
  TResource,
  TenantBaseParameters
>;

alias TenantResourceDelete<TResource extends ArmResource> = ResourceDelete<
  TResource,
  TenantBaseParameters
>;

alias TenantResourceUpdate<
  TResource extends ArmResource,
  TProperties extends TypeSpec.Reflection.Model
> = ResourceUpdate<TResource, TProperties, TenantBaseParameters>;

alias TenantResourceListByParent<TResource extends ArmResource> = ResourceListByParent<
  TResource,
  TenantBaseParameters,
  "Tenant",
  "tenant"
>;
