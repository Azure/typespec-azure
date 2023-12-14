using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using Autorest;
using Azure.ResourceManager.Foundations;

namespace Azure.ResourceManager;

// OPERATION TEMPLATES

/**
 * A resource list operation, at the subscription scope
 * @template TResource the resource being patched
 */
@autoRoute
@doc("List {name} resources by subscription ID", TResource)
@listsResource(TResource)
@segmentOf(TResource)
@armResourceList(TResource)
@get
op ArmListBySubscription<TResource extends ArmResource>(
  ...SubscriptionScope<TResource>,
): ArmResponse<ResourceListResult<TResource>> | ErrorResponse;

/**
 * A resource list operation, at the scope of the resource's parent
 * @template TResource the resource being patched
 * @template TBaseParameters Optional. Allows overriding the operation parameters
 * @template TParentName Optional. The name of the parent resource
 * @template TParentFriendlyName Optional. The friendly name of the parent resource
 */
@get
@autoRoute
@listsResource(TResource)
@segmentOf(TResource)
@armRenameListByOperation(TResource, TParentName, TParentFriendlyName) // This must come before @armResourceList!
@armResourceList(TResource)
op ArmResourceListByParent<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>,
  TParentName extends valueof string = "",
  TParentFriendlyName extends valueof string = ""
>(
  ...ResourceParentParameters<TResource, TBaseParameters>,
): ArmResponse<ResourceListResult<TResource>> | ErrorResponse;

/**
 * A resource list operation, with scope determined by TBaseParameters
 * @template TResource the resource being patched
 * @template TBaseParameters Optional. Allows overriding the operation parameters
 */
@get
@autoRoute
@listsResource(TResource)
@segmentOf(TResource)
@armRenameListByOperation(TResource) // This must come before @armResourceList!
@armResourceList(TResource)
op ArmResourceListAtScope<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>
>(
  ...ResourceParentParameters<TResource, TBaseParameters>,
): ArmResponse<ResourceListResult<TResource>> | ErrorResponse;

/**
 * A resource GET operation
 * @template TResource the resource being patched
 * @template TBaseParameters Optional. Allows overriding the operation parameters
 */
@autoRoute
@doc("Get a {name}", TResource)
@get
@armResourceRead(TResource)
op ArmResourceRead<TResource extends ArmResource, TBaseParameters = BaseParameters<TResource>>(
  ...ResourceInstanceParameters<TResource, TBaseParameters>,
): ArmResponse<TResource> | ErrorResponse;

/**
 * A long-running resource CreateOrUpdate (PUT)
 * @template TResource the resource being patched
 * @template TBaseParameters Optional. Allows overriding the operation parameters
 * @template LroHeadersOptional.  Allows overriding the lro headers returned on resource create
 */
@autoRoute
@doc("Create a {name}", TResource)
@extension("x-ms-long-running-operation", true)
@extension(
  "x-ms-long-running-operation-options",
  {
    `final-state-via`: "azure-async-operation",
  }
)
@armResourceCreateOrUpdate(TResource)
@put
op ArmResourceCreateOrUpdateAsync<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>,
  LroHeaders extends TypeSpec.Reflection.Model = ArmCombinedLroHeaders<
    ArmOperationStatus,
    TResource,
    string,
    string
  >
>(
  ...ResourceInstanceParameters<TResource, TBaseParameters>,

  @doc("Resource create parameters.")
  @body
  resource: TResource,
): ArmResourceUpdatedResponse<TResource> | ArmResourceCreatedResponse<
  TResource,
  LroHeaders
> | ErrorResponse;

/**
 * DEPRECATED: Please use ArmResourceCreateOrReplaceSync instead
 * @template TResource the resource being patched
 * @template TBaseParameters Optional. Allows overriding the operation parameters
 */
@autoRoute
@doc("Create a {name}", TResource)
@armResourceCreateOrUpdate(TResource)
@put
op ArmResourceCreateOrUpdateSync<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>
>(
  ...ResourceInstanceParameters<TResource, TBaseParameters>,

  @doc("Resource create parameters.")
  @body
  resource: TResource,
): ArmResponse<TResource> | ErrorResponse;

/**
 * Synchronous PUT operation for ARM resources
 * @template TResource the resource being patched
 * @template TBaseParameters Optional. Allows overriding the operation parameters
 */
@autoRoute
@doc("Create a {name}", TResource)
@armResourceCreateOrUpdate(TResource)
@put
op ArmResourceCreateOrReplaceSync<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>
>(
  ...ResourceInstanceParameters<TResource, TBaseParameters>,

  @doc("Resource create parameters.")
  @body
  resource: TResource,
): ArmResourceUpdatedResponse<TResource> | ArmResourceCreatedSyncResponse<TResource> | ErrorResponse;

alias ArmResourceCreateOrReplaceAsync<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>,
  LroHeaders extends TypeSpec.Reflection.Model = ArmCombinedLroHeaders<
    ArmOperationStatus,
    TResource,
    string,
    string
  >
> = ArmResourceCreateOrUpdateAsync<TResource, TBaseParameters, LroHeaders>;

/**
 * A long-running resource update that only allows updating resource tags (the minimum)
 * @template TResource the resource being patched
 * @template TBaseParameters Optional. Allows overriding the operation parameters
 * @template LroHeaders Optional.  Allows overriding the lro headers that appear in the Accepted repsonse
 */
alias ArmTagsPatchAsync<
  TResource extends ArmResource,
  TProperties extends {} = TagsUpdateModel<TResource>,
  TBaseParameters = BaseParameters<TResource>,
  LroHeaders extends TypeSpec.Reflection.Model = ArmCombinedLroHeaders<
    ArmOperationStatus,
    TResource,
    string,
    string
  >
> = ArmCustomPatchAsync<TResource, TagsUpdateModel<TResource>, TBaseParameters, LroHeaders>;

/**
 * A long-running resource update using the items from the resource marked with visibility "update"
 * @template TResource the resource being patched
 * @template TProperties The model type of the resource properties
 * @template TBaseParameters Optional. Allows overriding the operation parameters
 * @template LroHeaders Optional.  Allows overriding the lro headers returned in the Accepted response
 */
alias ArmResourcePatchAsync<
  TResource extends ArmResource,
  TProperties extends TypeSpec.Reflection.Model,
  TBaseParameters = BaseParameters<TResource>,
  LroHeaders extends TypeSpec.Reflection.Model = ArmCombinedLroHeaders<
    ArmOperationStatus,
    TResource,
    string,
    string
  >
> = ArmCustomPatchAsync<
  TResource,
  ResourceUpdateModel<TResource, TProperties>,
  TBaseParameters,
  LroHeaders
>;

/**
 * A long-running resource update using a custom PATCH payload (Asynchronous)
 * @template TResource the resource being patched
 * @template TPatchModel The input model for the PATCH request
 * @template TBaseParameters Optional. Allows overriding the operation parameters
 * @template LroHeaders Optional.  Allows overriding the lro headers returned in the Accepted response
 */
@autoRoute
@doc("Update a {name}", TResource)
@extension("x-ms-long-running-operation", true)
@extension(
  "x-ms-long-running-operation-options",
  {
    `final-state-via`: "location",
  }
)
@armResourceUpdate(TResource)
@patch
op ArmCustomPatchAsync<
  TResource extends ArmResource,
  TPatchModel extends TypeSpec.Reflection.Model = TagsUpdateModel<TResource>,
  TBaseParameters = BaseParameters<TResource>,
  LroHeaders extends TypeSpec.Reflection.Model = ArmCombinedLroHeaders<
    ArmOperationStatus,
    TResource,
    string,
    string
  >
>(
  ...ResourceInstanceParameters<TResource, TBaseParameters>,

  @doc("The resource properties to be updated.")
  @body
  properties: TPatchModel,
): ArmResponse<TResource> | ArmAcceptedLroResponse<
  "Resource update request accepted.",
  LroHeaders
> | ErrorResponse;

/**
 * A resource update that only allows updating resource tags (the minimum)
 * @template TResource the resource being patched
 * @template TBaseParameters Optional. Allows overriding the operation parameters
 */
alias ArmTagsPatchSync<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>
> = ArmCustomPatchSync<TResource, TagsUpdateModel<TResource>, TBaseParameters>;

/**
 * A resource update using the items from the resource marked with visibility "update"
 * @template TResource the resource being patched
 * @template TProperties The model type of the resource properties
 * @template TBaseParameters Optional. Allows overriding the operation parameters
 */
alias ArmResourcePatchSync<
  TResource extends ArmResource,
  TProperties extends TypeSpec.Reflection.Model,
  TBaseParameters = BaseParameters<TResource>
> = ArmCustomPatchSync<TResource, ResourceUpdateModel<TResource, TProperties>, TBaseParameters>;

/**
 * A resource update using a custom PATCH payload (synchronous)
 * @template TResource the resource being patched
 * @template TPatchModel The input model for the PATCH request
 * @template TBaseParameters Optional. Allows overriding the operation parameters
 */
@autoRoute
@doc("Update a {name}", TResource)
@armResourceUpdate(TResource)
@patch
op ArmCustomPatchSync<
  TResource extends ArmResource,
  TPatchModel extends TypeSpec.Reflection.Model = TagsUpdateModel<TResource>,
  TBaseParameters = BaseParameters<TResource>
>(
  ...ResourceInstanceParameters<TResource, TBaseParameters>,

  @doc("The resource properties to be updated.")
  @body
  properties: TPatchModel,
): ArmResponse<TResource> | ErrorResponse;

/**
 * @dev Delete a resource asynchronously
 * @template TResource The resource being deleted
 * @template TResponse The response type for the operation
 * @template TBaseParameters Optional. Allows overriding the parameters for the operation
 */
@autoRoute
@doc("Delete a {name}", TResource)
@extension("x-ms-long-running-operation", true)
@extension(
  "x-ms-long-running-operation-options",
  {
    `final-state-via`: "location",
  }
)
@armResourceDelete(TResource)
@delete
op ArmResourceDeleteAsyncBase<
  TResource extends ArmResource,
  TResponse,
  TBaseParameters = BaseParameters<TResource>
>(...ResourceInstanceParameters<TResource, TBaseParameters>): TResponse | ErrorResponse;

/**
 * @dev Delete a resource asynchronously.  DEPRECATED: Use ArmResourceDeleteWithoutOkAsync instead
 * @template TResource The resource being deleted
 * @template TBaseParameters Optional. Allows overriding the parameters for the operation
 * @template LroHeaders Optional. Allows overriding the headers in the Accepted response
 */
op ArmResourceDeleteAsync<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>,
  LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader
> is ArmResourceDeleteAsyncBase<
  TResource,
  ArmDeletedResponse | ArmDeleteAcceptedLroResponse<LroHeaders> | ArmDeletedNoContentResponse,
  TBaseParameters
>;

/**
 * @dev Delete a resource asynchronously
 * @template TResource The resource being deleted
 * @template TBaseParameters Optional. Allows overriding the parameters for the operation
 * @template LroHeaders Optional. Allows overriding the headers returned in the Accepted respsonse
 */
op ArmResourceDeleteWithoutOkAsync<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>,
  LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader
> is ArmResourceDeleteAsyncBase<
  TResource,
  ArmDeleteAcceptedLroResponse<LroHeaders> | ArmDeletedNoContentResponse,
  TBaseParameters
>;

/**
 * Delete a resource synchronously
 * @template TResource The resource being deleted
 * @template TBaseParameters Optional. Allows overriding the parameters for the operation
 */
@autoRoute
@doc("Delete a {name}", TResource)
@armResourceDelete(TResource)
@delete
op ArmResourceDeleteSync<
  TResource extends ArmResource,
  TBaseParameters = BaseParameters<TResource>
>(
  ...ResourceInstanceParameters<TResource, TBaseParameters>,
): ArmDeletedResponse | ArmDeletedNoContentResponse | ErrorResponse;

/**
 * A long-running resource action.
 * @template TResource The resource being acted upon
 * @template TRequest The request model for the action
 * @template TResponse The response type for the action
 * @template TBaseParameters Optional. Allows overriding the parameters for the operation
 */
@autoRoute
@extension("x-ms-long-running-operation", true)
@extension(
  "x-ms-long-running-operation-options",
  {
    `final-state-via`: "location",
  }
)
@armResourceAction(TResource)
@post
op ArmResourceActionAsyncBase<
  TResource extends ArmResource,
  TRequest extends TypeSpec.Reflection.Model | void,
  TResponse extends TypeSpec.Reflection.Model | void,
  TBaseParameters extends TypeSpec.Reflection.Model
>(
  ...ResourceInstanceParameters<TResource, TBaseParameters>,

  @doc("The content of the action request")
  @body
  body: TRequest,
): TResponse | ErrorResponse;

/**
 * A long-running resource action.
 * @template TResource The resource being acted upon
 * @template TRequest The request model for the action
 * @template TResponse The response model for the action
 * @template TBaseParameters Optional. Allows overriding the parameters for the operation
 * @template LroHeaders Optional. Allows overriding the headers returned in the Accepted respsonse
 */
@returnsDoc("ARM operation completed successfully.")
op ArmResourceActionAsync<
  TResource extends ArmResource,
  TRequest extends TypeSpec.Reflection.Model | void,
  TResponse extends TypeSpec.Reflection.Model | void,
  TBaseParameters extends TypeSpec.Reflection.Model = BaseParameters<TResource>,
  LroHeaders extends TypeSpec.Reflection.Model = ArmCombinedLroHeaders<
    ArmOperationStatus,
    TResponse,
    string,
    string
  >
> is ArmResourceActionAsyncBase<
  TResource,
  TRequest,
  ArmAcceptedLroResponse<"Resource operation accepted.", LroHeaders> | TResponse,
  TBaseParameters
>;

/**
 * A synchronous resource action.
 * @template TResource The resource being acted upon
 * @template TRequest The request model for the action
 * @template TResponse The response model for the action
 * @template TBaseParameters Optional. Allows overriding the parameters for the operation
 */
@autoRoute
@armResourceAction(TResource)
@post
@returnsDoc("ARM operation completed successfully.")
op ArmResourceActionSync<
  TResource extends ArmResource,
  TRequest extends TypeSpec.Reflection.Model | void,
  TResponse extends TypeSpec.Reflection.Model | void,
  TBaseParameters = BaseParameters<TResource>
>(
  ...ResourceInstanceParameters<TResource, TBaseParameters>,

  @doc("The content of the action request")
  @body
  body: TRequest,
): TResponse | ErrorResponse;

/**
 * A long-running resource action that returns no content. DEPRECATED: Use 'ArmResourceActionNoResponseContentAsync' instead
 * @template TResource The resource being acted upon
 * @template TRequest The request model for the action
 * @template TBaseParameters Optional. Allows overriding the parameters for the operation
 * @template LroHeaders Optional. Allows overriding the headers returned in the Accepted respsonse
 *
 */
op ArmResourceActionNoContentAsync<
  TResource extends ArmResource,
  TRequest extends TypeSpec.Reflection.Model | void,
  TBaseParameters extends TypeSpec.Reflection.Model = BaseParameters<TResource>,
  LroHeaders extends TypeSpec.Reflection.Model = ArmCombinedLroHeaders<
    ArmOperationStatus,
    void,
    string,
    string
  >
> is ArmResourceActionAsyncBase<
  TResource,
  TRequest,
  ArmAcceptedLroResponse | ArmNoContentResponse<"Action completed successfully.">,
  TBaseParameters
>;

/**
 * A long-running resource action that returns no content.
 * @template TResource The resource being acted upon
 * @template TRequest The request model for the action
 * @template TBaseParameters Optional. Allows overriding the parameters for the operation
 * @template Headers Optional. Allows overriding the headers returned in the Accepted respsonse
 */
op ArmResourceActionNoResponseContentAsync<
  TResource extends ArmResource,
  TRequest extends TypeSpec.Reflection.Model | void,
  TBaseParameters extends TypeSpec.Reflection.Model = BaseParameters<TResource>,
  LroHeaders extends TypeSpec.Reflection.Model = ArmCombinedLroHeaders<
    ArmOperationStatus,
    void,
    string,
    string
  >
> is ArmResourceActionAsyncBase<
  TResource,
  TRequest,
  ArmAcceptedLroResponse<"Resource operation accepted.", LroHeaders>,
  TBaseParameters
>;

/**
 * A synchronous resource action that returns no content.
 * @template TResource The resource being acted upon
 * @template TRequest The request model for the action
 * @template TBaseParameters Optional. Allows overriding the parameters for the operation
 */
@autoRoute
@armResourceAction(TResource)
@post
op ArmResourceActionNoContentSync<
  TResource extends ArmResource,
  TRequest extends TypeSpec.Reflection.Model | void,
  TBaseParameters = BaseParameters<TResource>
>(
  ...ResourceInstanceParameters<TResource, TBaseParameters>,

  @doc("The content of the action request")
  @body
  body: TRequest,
): ArmNoContentResponse<"Action completed successfully."> | ErrorResponse;

/**
 * Adds check global name availability operation, normally used if
 * a resource name must be globally unique (for example, if the resource
 * exposes and endpoint that uses the resource name in the url)
 * @template TRequest the availability request, defaults to the standard request, containing name and resource type
 * @template TResponse the availability response, default to the standard response
 * @template TAdditionalParams A model specifying additional non-path parameters to the availability request
 */
@doc("Implements global CheckNameAvailability operations")
op checkGlobalNameAvailability<
  TRequest extends TypeSpec.Reflection.Model = Azure.ResourceManager.Foundations.CheckNameAvailabilityRequest,
  TResponse extends TypeSpec.Reflection.Model = CheckNameAvailabilityResponse,
  TAdditionalParams extends TypeSpec.Reflection.Model = {}
> is checkNameAvailability<
  SubscriptionIdParameter & DefaultProviderNamespace,
  TRequest,
  TResponse,
  TAdditionalParams
>;

/**
 * Adds check location-specific name availability operation, normally used if
 * a resource name must be globally unique (for example, if the resource
 * exposes and endpoint that uses the resource name in the url)
 * @template TRequest the availability request, defaults to the standard request, containing name and resource type
 * @template TResponse the availability response, default to the standard response
 * @template TAdditionalParams A model specifying additional non-path parameters to the availability request
 */
@doc("Implements local CheckNameAvailability operations")
op checkLocalNameAvailability<
  TRequest extends TypeSpec.Reflection.Model = Azure.ResourceManager.Foundations.CheckNameAvailabilityRequest,
  TResponse extends TypeSpec.Reflection.Model = CheckNameAvailabilityResponse,
  TAdditionalParams extends TypeSpec.Reflection.Model = {}
> is checkNameAvailability<
  SubscriptionIdParameter & DefaultProviderNamespace & LocationParameter,
  TRequest,
  TResponse,
  TAdditionalParams
>;
