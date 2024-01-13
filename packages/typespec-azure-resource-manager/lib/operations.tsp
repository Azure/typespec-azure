using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using Autorest;
using Azure.ResourceManager.Foundations;

namespace Azure.ResourceManager;

// OPERATION TEMPLATES

/**
 * A resource list operation, at the subscription scope
 * @template Resource the resource being patched
 */
@autoRoute
@doc("List {name} resources by subscription ID", Resource)
@listsResource(Resource)
@segmentOf(Resource)
@armResourceList(Resource)
@get
op ArmListBySubscription<Resource extends ArmResource>(
  ...SubscriptionScope<Resource>,
): ArmResponse<ResourceListResult<Resource>> | ErrorResponse;

/**
 * A resource list operation, at the scope of the resource's parent
 * @template Resource the resource being patched
 * @template BaseParameters Optional. Allows overriding the operation parameters
 * @template ParentName Optional. The name of the parent resource
 * @template ParentFriendlyName Optional. The friendly name of the parent resource
 */
@get
@autoRoute
@listsResource(Resource)
@segmentOf(Resource)
@armRenameListByOperation(Resource, ParentName, ParentFriendlyName) // This must come before @armResourceList!
@armResourceList(Resource)
op ArmResourceListByParent<
  Resource extends ArmResource,
  BaseParameters = BaseParameters<Resource>,
  ParentName extends valueof string = "",
  ParentFriendlyName extends valueof string = ""
>(
  ...ResourceParentParameters<Resource, BaseParameters>,
): ArmResponse<ResourceListResult<Resource>> | ErrorResponse;

/**
 * A resource list operation, with scope determined by BaseParameters
 * @template Resource the resource being patched
 * @template BaseParameters Optional. Allows overriding the operation parameters
 */
@get
@autoRoute
@listsResource(Resource)
@segmentOf(Resource)
@armRenameListByOperation(Resource) // This must come before @armResourceList!
@armResourceList(Resource)
op ArmResourceListAtScope<Resource extends ArmResource, BaseParameters = BaseParameters<Resource>>(
  ...ResourceParentParameters<Resource, BaseParameters>,
): ArmResponse<ResourceListResult<Resource>> | ErrorResponse;

/**
 * A resource GET operation
 * @template Resource the resource being patched
 * @template BaseParameters Optional. Allows overriding the operation parameters
 */
@autoRoute
@doc("Get a {name}", Resource)
@get
@armResourceRead(Resource)
op ArmResourceRead<Resource extends ArmResourceBase, BaseParameters = BaseParameters<Resource>>(
  ...ResourceInstanceParameters<Resource, BaseParameters>,
): ArmResponse<Resource> | ErrorResponse;

/**
 * A long-running resource CreateOrUpdate (PUT)
 * @template Resource the resource being patched
 * @template BaseParameters Optional. Allows overriding the operation parameters
 * @template LroHeaders Optional.  Allows overriding the lro headers returned on resource create
 */
@autoRoute
@doc("Create a {name}", Resource)
@extension("x-ms-long-running-operation", true)
@extension(
  "x-ms-long-running-operation-options",
  {
    `final-state-via`: "azure-async-operation",
  }
)
@armResourceCreateOrUpdate(Resource)
@put
op ArmResourceCreateOrUpdateAsync<
  Resource extends ArmResource,
  BaseParameters = BaseParameters<Resource>,
  LroHeaders extends TypeSpec.Reflection.Model = {}
>(
  ...ResourceInstanceParameters<Resource, BaseParameters>,

  @doc("Resource create parameters.")
  @body
  resource: Resource,
): ArmResourceUpdatedResponse<Resource> | ArmResourceCreatedResponse<
  Resource,
  LroHeaders
> | ErrorResponse;

/**
 * DEPRECATED: Please use ArmResourceCreateOrReplaceSync instead
 * @template Resource the resource being patched
 * @template BaseParameters Optional. Allows overriding the operation parameters
 */
@autoRoute
@doc("Create a {name}", Resource)
@armResourceCreateOrUpdate(Resource)
@put
op ArmResourceCreateOrUpdateSync<
  Resource extends ArmResource,
  BaseParameters = BaseParameters<Resource>
>(
  ...ResourceInstanceParameters<Resource, BaseParameters>,

  @doc("Resource create parameters.")
  @body
  resource: Resource,
): ArmResponse<Resource> | ErrorResponse;

/**
 * Synchronous PUT operation for ARM resources
 * @template Resource the resource being patched
 * @template BaseParameters Optional. Allows overriding the operation parameters
 */
@autoRoute
@doc("Create a {name}", Resource)
@armResourceCreateOrUpdate(Resource)
@put
op ArmResourceCreateOrReplaceSync<
  Resource extends ArmResource,
  BaseParameters = BaseParameters<Resource>
>(
  ...ResourceInstanceParameters<Resource, BaseParameters>,

  @doc("Resource create parameters.")
  @body
  resource: Resource,
): ArmResourceUpdatedResponse<Resource> | ArmResourceCreatedSyncResponse<Resource> | ErrorResponse;

op ArmResourceCreateOrReplaceAsync<
  Resource extends ArmResource,
  BaseParameters = BaseParameters<Resource>,
  LroHeaders extends TypeSpec.Reflection.Model = {}
> is ArmResourceCreateOrUpdateAsync<Resource, BaseParameters, LroHeaders>;

/**
 * @dev A long-running resource update that only allows updating resource tags (the minimum)
 * @template Resource the resource being patched
 * @template BaseParameters Optional. Allows overriding the operation parameters
 * @template LroHeaders Optional.  Allows overriding the lro headers that appear in the Accepted response
 */
op ArmTagsPatchAsync<
  Resource extends ArmResource,
  Properties extends {} = TagsUpdateModel<Resource>,
  BaseParameters = BaseParameters<Resource>,
  LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader<
    Azure.Core.StatusMonitorPollingOptions<ArmOperationStatus>,
    Resource,
    string
  >
> is ArmCustomPatchAsync<Resource, TagsUpdateModel<Resource>, BaseParameters, LroHeaders>;

/**
 * @dev A long-running resource update using the items from the resource marked with visibility "update"
 * @template Resource the resource being patched
 * @template Properties The model type of the resource properties
 * @template BaseParameters Optional. Allows overriding the operation parameters
 * @template LroHeaders Optional.  Allows overriding the lro headers returned in the Accepted response
 */
op ArmResourcePatchAsync<
  Resource extends ArmResource,
  Properties extends TypeSpec.Reflection.Model,
  BaseParameters = BaseParameters<Resource>,
  LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader<
    Azure.Core.StatusMonitorPollingOptions<ArmOperationStatus>,
    Resource,
    string
  >
> is ArmCustomPatchAsync<
  Resource,
  ResourceUpdateModel<Resource, Properties>,
  BaseParameters,
  LroHeaders
>;

/**
 * A long-running resource update using a custom PATCH payload (Asynchronous)
 * @template Resource the resource being patched
 * @template PatchModel The input model for the PATCH request
 * @template BaseParameters Optional. Allows overriding the operation parameters
 * @template LroHeaders Optional.  Allows overriding the lro headers returned in the Accepted response
 */
@autoRoute
@doc("Update a {name}", Resource)
@extension("x-ms-long-running-operation", true)
@extension(
  "x-ms-long-running-operation-options",
  {
    `final-state-via`: "location",
  }
)
@armResourceUpdate(Resource)
@patch
op ArmCustomPatchAsync<
  Resource extends ArmResource,
  PatchModel extends TypeSpec.Reflection.Model = TagsUpdateModel<Resource>,
  BaseParameters = BaseParameters<Resource>,
  LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader<
    Azure.Core.StatusMonitorPollingOptions<ArmOperationStatus>,
    Resource,
    string
  >
>(
  ...ResourceInstanceParameters<Resource, BaseParameters>,

  @doc("The resource properties to be updated.")
  @body
  properties: PatchModel,
): ArmResponse<Resource> | ArmAcceptedLroResponse<
  "Resource update request accepted.",
  LroHeaders
> | ErrorResponse;

/**
 * @dev A resource update that only allows updating resource tags (the minimum)
 * @template Resource the resource being patched
 * @template BaseParameters Optional. Allows overriding the operation parameters
 */
op ArmTagsPatchSync<
  Resource extends ArmResource,
  BaseParameters = BaseParameters<Resource>
> is ArmCustomPatchSync<Resource, TagsUpdateModel<Resource>, BaseParameters>;

/**
 * @dev A resource update using the items from the resource marked with visibility "update"
 * @template Resource the resource being patched
 * @template Properties The model type of the resource properties
 * @template BaseParameters Optional. Allows overriding the operation parameters
 */
op ArmResourcePatchSync<
  Resource extends ArmResource,
  Properties extends TypeSpec.Reflection.Model,
  BaseParameters = BaseParameters<Resource>
> is ArmCustomPatchSync<Resource, ResourceUpdateModel<Resource, Properties>, BaseParameters>;

/**
 * A resource update using a custom PATCH payload (synchronous)
 * @template Resource the resource being patched
 * @template PatchModel The input model for the PATCH request
 * @template BaseParameters Optional. Allows overriding the operation parameters
 */
@autoRoute
@doc("Update a {name}", Resource)
@armResourceUpdate(Resource)
@patch
op ArmCustomPatchSync<
  Resource extends ArmResource,
  PatchModel extends TypeSpec.Reflection.Model = TagsUpdateModel<Resource>,
  BaseParameters = BaseParameters<Resource>
>(
  ...ResourceInstanceParameters<Resource, BaseParameters>,

  @doc("The resource properties to be updated.")
  @body
  properties: PatchModel,
): ArmResponse<Resource> | ErrorResponse;

/**
 * @dev Delete a resource asynchronously
 * @template Resource The resource being deleted
 * @template Response The response type for the operation
 * @template BaseParameters Optional. Allows overriding the parameters for the operation
 */
@autoRoute
@doc("Delete a {name}", Resource)
@extension("x-ms-long-running-operation", true)
@extension(
  "x-ms-long-running-operation-options",
  {
    `final-state-via`: "location",
  }
)
@armResourceDelete(Resource)
@delete
op ArmResourceDeleteAsyncBase<
  Resource extends ArmResource,
  Response,
  BaseParameters = BaseParameters<Resource>
>(...ResourceInstanceParameters<Resource, BaseParameters>): Response | ErrorResponse;

/**
 * @dev Delete a resource asynchronously.  DEPRECATED: Use ArmResourceDeleteWithoutOkAsync instead
 * @template Resource The resource being deleted
 * @template BaseParameters Optional. Allows overriding the parameters for the operation
 * @template LroHeaders Optional. Allows overriding the headers in the Accepted response
 */
op ArmResourceDeleteAsync<
  Resource extends ArmResource,
  BaseParameters = BaseParameters<Resource>,
  LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader
> is ArmResourceDeleteAsyncBase<
  Resource,
  ArmDeletedResponse | ArmDeleteAcceptedLroResponse<LroHeaders> | ArmDeletedNoContentResponse,
  BaseParameters
>;

/**
 * @dev Delete a resource asynchronously
 * @template Resource The resource being deleted
 * @template BaseParameters Optional. Allows overriding the parameters for the operation
 * @template LroHeaders Optional. Allows overriding the headers returned in the Accepted response
 */
op ArmResourceDeleteWithoutOkAsync<
  Resource extends ArmResource,
  BaseParameters = BaseParameters<Resource>,
  LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader
> is ArmResourceDeleteAsyncBase<
  Resource,
  ArmDeleteAcceptedLroResponse<LroHeaders> | ArmDeletedNoContentResponse,
  BaseParameters
>;

/**
 * Delete a resource synchronously
 * @template Resource The resource being deleted
 * @template BaseParameters Optional. Allows overriding the parameters for the operation
 */
@autoRoute
@doc("Delete a {name}", Resource)
@armResourceDelete(Resource)
@delete
op ArmResourceDeleteSync<Resource extends ArmResource, BaseParameters = BaseParameters<Resource>>(
  ...ResourceInstanceParameters<Resource, BaseParameters>,
): ArmDeletedResponse | ArmDeletedNoContentResponse | ErrorResponse;

/**
 * A long-running resource action.
 * @template Resource The resource being acted upon
 * @template Request The request model for the action
 * @template Response The response type for the action
 * @template BaseParameters Optional. Allows overriding the parameters for the operation
 */
@autoRoute
@extension("x-ms-long-running-operation", true)
@extension(
  "x-ms-long-running-operation-options",
  {
    `final-state-via`: "location",
  }
)
@armResourceAction(Resource)
@post
op ArmResourceActionAsyncBase<
  Resource extends ArmResource,
  Request extends TypeSpec.Reflection.Model | void,
  Response extends TypeSpec.Reflection.Model | void,
  BaseParameters extends TypeSpec.Reflection.Model
>(
  ...ResourceInstanceParameters<Resource, BaseParameters>,

  @doc("The content of the action request")
  @body
  body: Request,
): Response | ErrorResponse;

/**
 * @dev A long-running resource action.
 * @template Resource The resource being acted upon
 * @template Request The request model for the action
 * @template Response The response model for the action
 * @template BaseParameters Optional. Allows overriding the parameters for the operation
 * @template LroHeaders Optional. Allows overriding the headers returned in the Accepted response
 */
@returnsDoc("ARM operation completed successfully.")
op ArmResourceActionAsync<
  Resource extends ArmResource,
  Request extends TypeSpec.Reflection.Model | void,
  Response extends TypeSpec.Reflection.Model | void,
  BaseParameters extends TypeSpec.Reflection.Model = BaseParameters<Resource>,
  LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader<
    Azure.Core.StatusMonitorPollingOptions<ArmOperationStatus>,
    Response,
    string
  >
> is ArmResourceActionAsyncBase<
  Resource,
  Request,
  ArmAcceptedLroResponse<"Resource operation accepted.", LroHeaders> | Response,
  BaseParameters
>;

/**
 * A synchronous resource action.
 * @template Resource The resource being acted upon
 * @template Request The request model for the action
 * @template Response The response model for the action
 * @template BaseParameters Optional. Allows overriding the parameters for the operation
 */
@autoRoute
@armResourceAction(Resource)
@post
@returnsDoc("ARM operation completed successfully.")
op ArmResourceActionSync<
  Resource extends ArmResource,
  Request extends TypeSpec.Reflection.Model | void,
  Response extends TypeSpec.Reflection.Model | void,
  BaseParameters = BaseParameters<Resource>
>(
  ...ResourceInstanceParameters<Resource, BaseParameters>,

  @doc("The content of the action request")
  @body
  body: Request,
): Response | ErrorResponse;

/**
 * @dev A long-running resource action that returns no content. DEPRECATED: Use 'ArmResourceActionNoResponseContentAsync' instead
 * @template Resource The resource being acted upon
 * @template Request The request model for the action
 * @template BaseParameters Optional. Allows overriding the parameters for the operation
 * @template LroHeaders Optional. Allows overriding the headers returned in the Accepted response
 *
 */
op ArmResourceActionNoContentAsync<
  Resource extends ArmResource,
  Request extends TypeSpec.Reflection.Model | void,
  BaseParameters extends TypeSpec.Reflection.Model = BaseParameters<Resource>,
  LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader<
    Azure.Core.StatusMonitorPollingOptions<ArmOperationStatus>,
    void,
    string
  >
> is ArmResourceActionAsyncBase<
  Resource,
  Request,
  ArmAcceptedLroResponse | ArmNoContentResponse<"Action completed successfully.">,
  BaseParameters
>;

/**
 * @dev A long-running resource action that returns no content.
 * @template Resource The resource being acted upon
 * @template Request The request model for the action
 * @template BaseParameters Optional. Allows overriding the parameters for the operation
 * @template LroHeaders Optional. Allows overriding the headers returned in the Accepted response
 */
op ArmResourceActionNoResponseContentAsync<
  Resource extends ArmResource,
  Request extends TypeSpec.Reflection.Model | void,
  BaseParameters extends TypeSpec.Reflection.Model = BaseParameters<Resource>,
  LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader<
    Azure.Core.StatusMonitorPollingOptions<ArmOperationStatus>,
    void,
    string
  >
> is ArmResourceActionAsyncBase<
  Resource,
  Request,
  ArmAcceptedLroResponse<"Resource operation accepted.", LroHeaders>,
  BaseParameters
>;

/**
 * A synchronous resource action that returns no content.
 * @template Resource The resource being acted upon
 * @template Request The request model for the action
 * @template BaseParameters Optional. Allows overriding the parameters for the operation
 */
@autoRoute
@armResourceAction(Resource)
@post
op ArmResourceActionNoContentSync<
  Resource extends ArmResource,
  Request extends TypeSpec.Reflection.Model | void,
  BaseParameters = BaseParameters<Resource>
>(
  ...ResourceInstanceParameters<Resource, BaseParameters>,

  @doc("The content of the action request")
  @body
  body: Request,
): ArmNoContentResponse<"Action completed successfully."> | ErrorResponse;

/**
 * @dev Adds check global name availability operation, normally used if
 * a resource name must be globally unique (for example, if the resource
 * exposes and endpoint that uses the resource name in the url)
 * @template Request the availability request, defaults to the standard request, containing name and resource type
 * @template Response the availability response, default to the standard response
 * @template AdditionalParameters A model specifying additional non-path parameters to the availability request
 */
@doc("Implements global CheckNameAvailability operations")
op checkGlobalNameAvailability<
  Request extends TypeSpec.Reflection.Model = Azure.ResourceManager.Foundations.CheckNameAvailabilityRequest,
  Response extends TypeSpec.Reflection.Model = CheckNameAvailabilityResponse,
  AdditionalParameters extends TypeSpec.Reflection.Model = {}
> is checkNameAvailability<
  SubscriptionIdParameter & DefaultProviderNamespace,
  Request,
  Response,
  AdditionalParameters
>;

/**
 * @dev Adds check location-specific name availability operation, normally used if
 * a resource name must be globally unique (for example, if the resource
 * exposes and endpoint that uses the resource name in the url)
 * @template Request the availability request, defaults to the standard request, containing name and resource type
 * @template Response the availability response, default to the standard response
 * @template AdditionalParameters A model specifying additional non-path parameters to the availability request
 */
@doc("Implements local CheckNameAvailability operations")
op checkLocalNameAvailability<
  Request extends TypeSpec.Reflection.Model = Azure.ResourceManager.Foundations.CheckNameAvailabilityRequest,
  Response extends TypeSpec.Reflection.Model = CheckNameAvailabilityResponse,
  AdditionalParameters extends TypeSpec.Reflection.Model = {}
> is checkNameAvailability<
  SubscriptionIdParameter & DefaultProviderNamespace & LocationParameter,
  Request,
  Response,
  AdditionalParameters
>;
