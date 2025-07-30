import "@typespec/rest";
import "@typespec/http";

namespace Azure.ResourceManager.Legacy;

using Http;
using Azure.ResourceManager.Foundations;
using Azure.ResourceManager.Private;
using Rest;

/**
 * An operation template used to build resource operations in which the same resource type
 * is accessible at multiple, fixed resource paths.
 * @template ParentParameters The path parameters for the resource parent
 * @template ResourceTypeParameter The path parameter for the resource name
 * @template ErrorType Optional. The type of error models used in operations created form this template
 */
interface LegacyOperations<
  ParentParameters extends {},
  ResourceTypeParameter extends {},
  ErrorType extends {} = ErrorResponse
> extends RoutedOperations<ParentParameters, ResourceTypeParameter, ErrorType> {}

/**
 * An operation template used to build resource operations in which the same resource type
 * is accessible at multiple, fixed resource paths. Can be used with static routes.
 * @template ParentParameters The path parameters for the resource parent
 * @template ResourceTypeParameter The path parameter for the resource name
 * @template ErrorType Optional. The type of error models used in operations created form this template
 * @template ResourceRoute Optional. The resource route to use for operations in the interface.
 */
@doc("")
interface RoutedOperations<
  ParentParameters extends {},
  ResourceTypeParameter extends {},
  ErrorType extends {} = ErrorResponse,
  ResourceRoute extends valueof ArmOperationOptions = #{ useStaticRoute: false }
> {
  /**
   * A long-running resource CreateOrUpdate (PUT)
   * @template Resource the resource being created or updated
   * @template LroHeaders Optional.  Allows overriding the lro headers returned on resource create
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response(s) for the PUT operation
   * @template OptionalRequestBody Optional. Indicates whether the request body is optional
   * @template OverrideErrorType Optional. The error response, if non-standard.
   * @template OverrideRouteOptions Optional. The route options for the operation.
   */
  @doc("Create a {name}", Resource)
  @armOperationRoute(OverrideRouteOptions)
  @armResourceCreateOrUpdate(Resource)
  @Private.armUpdateProviderNamespace
  @Azure.Core.Foundations.Private.defaultFinalStateVia(#["location", "azure-async-operation"])
  @put
  CreateOrUpdateAsync<
    Resource extends Foundations.SimpleResource,
    LroHeaders extends TypeSpec.Reflection.Model = ArmAsyncOperationHeader<FinalResult = Resource> &
      Azure.Core.Foundations.RetryAfterHeader,
    Parameters extends {} = {},
    Response extends {} = ArmResourceUpdatedResponse<Resource> | ArmResourceCreatedResponse<
      Resource,
      LroHeaders
    >,
    OptionalRequestBody extends valueof boolean = false,
    OverrideErrorType extends {} = ErrorType,
    OverrideRouteOptions extends valueof ArmOperationOptions = ResourceRoute
  >(
    ...ParentParameters,
    ...ResourceTypeParameter,
    ...Parameters,
    @doc("Resource create parameters.") @armBodyRoot(OptionalRequestBody) resource: Resource,
  ): Response | OverrideErrorType;

  /**
   * A synchronous resource CreateOrUpdate (PUT)
   * @template Resource the resource being created or updated
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response(s) for the PUT operation
   * @template OptionalRequestBody Optional. Indicates whether the request body is optional
   * @template OverrideErrorType Optional. The error response, if non-standard.
   * @template OverrideRouteOptions Optional. The route options for the operation.
   */
  #suppress "@azure-tools/typespec-azure-core/no-private-usage"
  @armOperationRoute(OverrideRouteOptions)
  @doc("Create a {name}", Resource)
  @armResourceCreateOrUpdate(Resource)
  @Private.armUpdateProviderNamespace
  @put
  CreateOrUpdateSync<
    Resource extends Foundations.SimpleResource,
    Parameters extends {} = {},
    Response extends {} = ArmResourceUpdatedResponse<Resource> | ArmResourceCreatedSyncResponse<Resource>,
    OptionalRequestBody extends valueof boolean = false,
    OverrideErrorType extends {} = ErrorType,
    OverrideRouteOptions extends valueof ArmOperationOptions = ResourceRoute
  >(
    ...ParentParameters,
    ...ResourceTypeParameter,
    ...Parameters,
    @doc("Resource create parameters.") @armBodyRoot(OptionalRequestBody) resource: Resource,
  ): Response | OverrideErrorType;

  /**
   * A long-running resource Update (PATCH)
   * @template Resource the resource being created or updated
   * @template PatchModel the PATCH request model
   * @template LroHeaders Optional.  Allows overriding the lro headers returned on resource create
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response(s) for the PATCH operation
   * @template OptionalRequestBody Optional. Indicates whether the request body is optional
   * @template OverrideErrorType Optional. The error response, if non-standard.
   * @template OverrideRouteOptions Optional. The route options for the operation.
   */
  @doc("Update a {name}", Resource)
  @armOperationRoute(OverrideRouteOptions)
  @armResourceUpdate(Resource)
  @Private.armUpdateProviderNamespace
  @patch(#{ implicitOptionality: false })
  CustomPatchAsync<
    Resource extends Foundations.SimpleResource,
    PatchModel extends {} = Azure.ResourceManager.Foundations.TagsUpdateModel<Resource>,
    LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader<
      Azure.Core.StatusMonitorPollingOptions<ArmOperationStatus>,
      Resource,
      string
    > &
      Azure.Core.Foundations.RetryAfterHeader,
    Parameters extends {} = {},
    Response extends {} = ArmResponse<Resource> | ArmAcceptedLroResponse<
      "Resource update request accepted.",
      LroHeaders
    >,
    OptionalRequestBody extends valueof boolean = false,
    OverrideErrorType extends {} = ErrorType,
    OverrideRouteOptions extends valueof ArmOperationOptions = ResourceRoute
  >(
    ...ParentParameters,
    ...ResourceTypeParameter,
    ...Parameters,
    @doc("Resource create parameters.") @armBodyRoot(OptionalRequestBody) properties: PatchModel,
  ): Response | OverrideErrorType;

  /**
   * A synchronous resource Update (PATCH)
   * @template Resource the resource being created or updated
   * @template PatchModel the PATCH request model
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response(s) for the PATCH operation
   * @template OptionalRequestBody Optional. Indicates whether the request body is optional
   * @template OverrideErrorType Optional. The error response, if non-standard.
   * @template OverrideRouteOptions Optional. The route options for the operation.
   */
  @doc("Update a {name}", Resource)
  @armOperationRoute(OverrideRouteOptions)
  @armResourceUpdate(Resource)
  @Private.armUpdateProviderNamespace
  @patch(#{ implicitOptionality: false })
  CustomPatchSync<
    Resource extends Foundations.SimpleResource,
    PatchModel extends {} = Azure.ResourceManager.Foundations.TagsUpdateModel<Resource>,
    Parameters extends {} = {},
    Response extends {} = ArmResponse<Resource>,
    OptionalRequestBody extends valueof boolean = false,
    OverrideErrorType extends {} = ErrorType,
    OverrideRouteOptions extends valueof ArmOperationOptions = ResourceRoute
  >(
    ...ParentParameters,
    ...ResourceTypeParameter,
    ...Parameters,
    @doc("Resource create parameters.") @armBodyRoot(OptionalRequestBody) properties: PatchModel,
  ): Response | OverrideErrorType;

  /**
   * Delete a resource asynchronously
   * @template Resource The resource being deleted
   * @template LroHeaders The lro headers for the operation
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response(s) for the delete operation
   * @template OverrideErrorType Optional. The error response, if non-standard.
   * @template OverrideRouteOptions Optional. The route options for the operation.
   */
  #suppress "@azure-tools/typespec-azure-core/no-response-body" "Valid"
  @doc("Delete a {name}", Resource)
  @armOperationRoute(OverrideRouteOptions)
  @delete
  @deletesResource(Resource)
  @Private.armUpdateProviderNamespace
  @armResourceDelete(Resource)
  DeleteWithoutOkAsync<
    Resource extends Foundations.SimpleResource,
    LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader &
      Azure.Core.Foundations.RetryAfterHeader,
    Parameters extends {} = {},
    Response extends {} = ArmDeleteAcceptedLroResponse<LroHeaders> | ArmDeletedNoContentResponse,
    OverrideErrorType extends {} = ErrorType,
    OverrideRouteOptions extends valueof ArmOperationOptions = ResourceRoute
  >(...ParentParameters, ...ResourceTypeParameter, ...Parameters): Response | OverrideErrorType;

  /**
   * Delete a resource synchronously
   * @template Resource The resource being deleted
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response(s) for the delete operation
   * @template OverrideErrorType Optional. The error response, if non-standard.
   * @template OverrideRouteOptions Optional. The route options for the operation.
   */
  #suppress "@azure-tools/typespec-azure-core/no-response-body" "Valid"
  @doc("Delete a {name}", Resource)
  @armOperationRoute(OverrideRouteOptions)
  @delete
  @deletesResource(Resource)
  @armResourceDelete(Resource)
  @Private.armUpdateProviderNamespace
  DeleteSync<
    Resource extends Foundations.SimpleResource,
    Parameters extends {} = {},
    Response extends {} = ArmDeletedResponse | ArmDeletedNoContentResponse,
    OverrideErrorType extends {} = ErrorType,
    OverrideRouteOptions extends valueof ArmOperationOptions = ResourceRoute
  >(...ParentParameters, ...ResourceTypeParameter, ...Parameters): Response | OverrideErrorType;

  /**
   * @dev Get a resource
   * @template Resource The resource being read
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response for a get operation.
   * @template OverrideErrorType Optional. The error response, if non-standard.
   * @template OverrideRouteOptions Optional. The route options for the operation.
   */
  @doc("Get a {name}", Resource)
  @armOperationRoute(OverrideRouteOptions)
  @get
  @readsResource(Resource)
  @armResourceRead(Resource)
  @Private.armUpdateProviderNamespace
  Read<
    Resource extends Foundations.SimpleResource,
    Parameters extends {} = {},
    Response extends {} = ArmResponse<Resource>,
    OverrideErrorType extends {} = ErrorType,
    OverrideRouteOptions extends valueof ArmOperationOptions = ResourceRoute
  >(...ParentParameters, ...ResourceTypeParameter, ...Parameters): Response | OverrideErrorType;

  /**
   * Check a resource's existence via HEAD operation
   * @template Resource The resource being checked
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response for a head operation (by default NoContent or NotFound response).
   * @template OverrideErrorType Optional. The error response, if non-standard.
   * @template OverrideRouteOptions Optional. The route options for the operation.
   */
  @armOperationRoute(OverrideRouteOptions)
  @doc("Check for the existence of a {name}", Resource)
  @Private.armUpdateProviderNamespace
  @head
  CheckExistence<
    Resource extends Foundations.SimpleResource,
    Parameters extends {} = {},
    Response extends {} = ArmResourceExistsResponse | ArmResourceNotFoundResponse,
    OverrideErrorType extends {} = ErrorType,
    OverrideRouteOptions extends valueof ArmOperationOptions = ResourceRoute
  > is Foundations.ArmReadOperation<
    ParentParameters & ResourceTypeParameter & Parameters,
    Response,
    OverrideErrorType
  >;

  /**
   * List a resource
   * @template Resource The resource being listed
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The response returned by the list
   * @template OverrideErrorType Optional. The error response, if non-standard.
   * @template OverrideRouteOptions Optional. The route options for the operation.
   */
  @doc("List a {name}", Resource)
  @get
  @list
  @listsResource(Resource)
  @segmentOf(ResourceTypeParameter)
  @armOperationRoute(OverrideRouteOptions)
  @armResourceList(Resource)
  @Private.armUpdateProviderNamespace
  List<
    Resource extends Foundations.SimpleResource,
    Parameters extends {} = {},
    Response extends {} = ArmResponse<ResourceListResult<Resource>>,
    OverrideErrorType extends {} = ErrorType,
    OverrideRouteOptions extends valueof ArmOperationOptions = ResourceRoute
  >(...ParentParameters, ...Parameters): Response | OverrideErrorType;

  /**
   * A synchronous resource action.
   * @template Resource The resource being acted upon
   * @template Request The request model for the action
   * @template Response The response model for the action
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template OptionalRequestBody Optional. Indicates whether the request body is optional
   * @template OverrideErrorType Optional. The error response, if non-standard.
   * @template OverrideRouteOptions Optional. The route options for the operation.
   */
  @doc("")
  @armResourceAction(Resource)
  @armOperationRoute(OverrideRouteOptions)
  @Private.enforceConstraint(Resource, Foundations.Resource)
  @post
  @Private.armUpdateProviderNamespace
  @returnsDoc("Azure operation completed successfully.")
  ActionSync<
    Resource extends Foundations.SimpleResource,
    Request extends TypeSpec.Reflection.Model | void,
    Response extends TypeSpec.Reflection.Model | void,
    Parameters extends {} = {},
    OptionalRequestBody extends valueof boolean = false,
    OverrideErrorType extends {} = ErrorType,
    OverrideRouteOptions extends valueof ArmOperationOptions = ResourceRoute
  >(
    ...ParentParameters,
    ...ResourceTypeParameter,
    ...Parameters,

    @doc("The content of the action request")
    @armBodyRoot(OptionalRequestBody)
    body: Request,
  ): Response | OverrideErrorType;

  /**
   * A long-running resource action.
   * @template Resource The resource being acted upon
   * @template Request The request model for the action
   * @template Result The result model for the action when the operation is successful
   * @template LroHeaders Optional. Allows overriding the headers returned in the Accepted response
   * @template Response The union of successful responses for the action
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template OptionalRequestBody Optional. Indicates whether the request body is optional
   * @template OverrideErrorType Optional. The error response, if non-standard.
   * @template OverrideRouteOptions Optional. The route options for the operation.
   */
  #suppress "@azure-tools/typespec-azure-core/no-response-body" "ARM"
  @doc("")
  @armResourceAction(Resource)
  @armOperationRoute(OverrideRouteOptions)
  @Private.enforceConstraint(Resource, Foundations.Resource)
  @Private.armUpdateProviderNamespace
  @post
  @returnsDoc("Azure operation completed successfully.")
  ActionAsync<
    Resource extends Foundations.SimpleResource,
    Request extends TypeSpec.Reflection.Model | void,
    Result extends TypeSpec.Reflection.Model | void,
    LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader<
      Azure.Core.StatusMonitorPollingOptions<ArmOperationStatus>,
      Result,
      string
    > &
      Azure.Core.Foundations.RetryAfterHeader,
    Parameters extends {} = {},
    Response extends {} | void = ArmAcceptedLroResponse<
      "Resource operation accepted.",
      LroHeaders
    > | Result,
    OptionalRequestBody extends valueof boolean = false,
    OverrideErrorType extends {} = ErrorType,
    OverrideRouteOptions extends valueof ArmOperationOptions = ResourceRoute
  >(
    ...ParentParameters,
    ...ResourceTypeParameter,
    ...Parameters,

    @doc("The content of the action request")
    @armBodyRoot(OptionalRequestBody)
    body: Request,
  ): Response | OverrideErrorType;
}
/**
 * @dev DEPRECATED: Use ProviderParameter instead. Get the provider namespace key-value pair
 * @template Resource Optional.  The resource to get the provider namespace for.
 */
model Provider<Resource extends {} = TenantActionScope> {
  ...ProviderNamespace<Resource>;
}

/**
 * @dev Get the provider namespace key-value pair
 * @template Resource The resource to get the provider namespace for.
 */
model ProviderParameter<Resource extends {}> {
  ...ProviderNamespace<Resource>;
}

/**
 * A long-running resource update using a custom PATCH payload (Asynchronous)
 * @template Resource the resource being patched
 * @template PatchModel The input model for the PATCH request
 * @template BaseParameters Optional. Allows overriding the operation parameters
 * @template LroHeaders Optional.  Allows overriding the lro headers returned in the Accepted response
 * @template Parameters Optional. Additional parameters after the path parameters
 * @template Response Optional. The success response for the patch operation
 * @template Error Optional. The error response, if non-standard.
 * @template OptionalRequestBody Optional. Indicates whether the request body is optional
 */
@autoRoute
@doc("Update a {name}", Resource)
@armResourceUpdate(Resource)
@Private.enforceConstraint(Resource, Foundations.Resource)
@patch(#{ implicitOptionality: false })
op CustomPatchAsync<
  Resource extends Foundations.SimpleResource,
  PatchModel extends TypeSpec.Reflection.Model | void = TagsUpdateModel<Resource>,
  BaseParameters = DefaultBaseParameters<Resource>,
  LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader<
    Azure.Core.StatusMonitorPollingOptions<ArmOperationStatus>,
    Resource,
    string
  > &
    Azure.Core.Foundations.RetryAfterHeader,
  Parameters extends {} = {},
  Response extends {} = ArmResponse<Resource> | ArmAcceptedLroResponse<
    "Resource update request accepted.",
    LroHeaders
  >,
  Error extends {} = ErrorResponse,
  OptionalRequestBody extends valueof boolean = false
> is UpdateOperation<
  ResourceInstanceParameters<Resource, BaseParameters> & Parameters,
  PatchModel,
  Response,
  Error,
  OptionalRequestBody
>;

/**
 * A resource update using a custom PATCH payload (synchronous)
 * @template Resource the resource being patched
 * @template PatchModel The input model for the PATCH request
 * @template BaseParameters Optional. Allows overriding the operation parameters
 * @template Parameters Optional. Additional parameters after the path parameters
 * @template Response Optional. The success response for the patch operation
 * @template Error Optional. The error response, if non-standard.
 * @template OptionalRequestBody Optional. Indicates whether the request body is optional
 */
@autoRoute
@doc("Update a {name}", Resource)
@armResourceUpdate(Resource)
@Private.enforceConstraint(Resource, Foundations.Resource)
@patch(#{ implicitOptionality: false })
op CustomPatchSync<
  Resource extends Foundations.SimpleResource,
  PatchModel extends TypeSpec.Reflection.Model | void = TagsUpdateModel<Resource>,
  BaseParameters = DefaultBaseParameters<Resource>,
  Parameters extends {} = {},
  Response extends {} = ArmResponse<Resource>,
  Error extends {} = ErrorResponse,
  OptionalRequestBody extends valueof boolean = false
> is UpdateOperation<
  ResourceInstanceParameters<Resource, BaseParameters> & Parameters,
  PatchModel,
  Response,
  Error,
  OptionalRequestBody
>;

/**
 * A long-running resource CreateOrUpdate (PUT)
 * @template Resource the resource being created or updated
 * @template Request The request body for the operation
 * @template BaseParameters Optional. Allows overriding the operation parameters
 * @template LroHeaders Optional.  Allows overriding the lro headers returned on resource create
 * @template Parameters Optional. Additional parameters after the path parameters
 * @template Response Optional. The success response for the createOrUpdate operation
 * @template Error Optional. The error response, if non-standard.
 * @template OptionalRequestBody Optional. Indicates whether the request body is optional
 */
@autoRoute
@doc("Create a {name}", Resource)
@armResourceCreateOrUpdate(Resource)
@Private.enforceConstraint(Resource, Foundations.Resource)
@Azure.Core.Foundations.Private.defaultFinalStateVia(#["location", "azure-async-operation"])
@put
op CreateOrUpdateAsync<
  Resource extends Foundations.SimpleResource,
  Request extends {} | void = Resource,
  BaseParameters = DefaultBaseParameters<Resource>,
  LroHeaders extends TypeSpec.Reflection.Model = ArmAsyncOperationHeader<FinalResult = Resource> &
    Azure.Core.Foundations.RetryAfterHeader,
  Parameters extends {} = {},
  Response extends {} = ArmResourceUpdatedResponse<Resource> | ArmResourceCreatedResponse<
    Resource,
    LroHeaders
  >,
  Error extends {} = ErrorResponse,
  OptionalRequestBody extends valueof boolean = false
> is CreateOperation<
  ResourceInstanceParameters<Resource, BaseParameters> & Parameters,
  Request,
  Response,
  Error,
  OptionalRequestBody
>;

/**
 * Synchronous PUT operation for Azure Resource Manager resources
 * @template Resource the resource being created or replaced
 * @template Request The request body for the operation
 * @template BaseParameters Optional. Allows overriding the operation parameters
 * @template Parameters Optional. Additional parameters after the path parameters
 * @template Response Optional. The success response for the createOrUpdate operation
 * @template Error Optional. The error response, if non-standard.
 * @template OptionalRequestBody Optional. Indicates whether the request body is optional
 */
@autoRoute
@doc("Create a {name}", Resource)
@armResourceCreateOrUpdate(Resource)
@Private.enforceConstraint(Resource, Foundations.Resource)
@put
op CreateOrUpdateSync<
  Resource extends Foundations.SimpleResource,
  Request extends {} | void = Resource,
  BaseParameters = DefaultBaseParameters<Resource>,
  Parameters extends {} = {},
  Response extends {} = ArmResourceUpdatedResponse<Resource> | ArmResourceCreatedSyncResponse<Resource>,
  Error extends {} = ErrorResponse,
  OptionalRequestBody extends valueof boolean = false
> is CreateOperation<
  ResourceInstanceParameters<Resource, BaseParameters> & Parameters,
  Request,
  Response,
  Error,
  OptionalRequestBody
>;

/**
 * @dev The base template for Azure Resource Manager PUT Operations.
 * @template HttpParameters The parameter object for the operation.
 * @template BodyParameter The body parameter
 * @template Response The response or union of responses for success.
 * @template ErrorResponse The error response.
 */
op CreateOperation<
  HttpParameters extends {},
  BodyParameter extends {} | void,
  Response extends {},
  ErrorResponse extends {},
  OptionalRequestBody extends valueof boolean = false
>(
  ...HttpParameters,
  @doc("Resource create parameters.") 
  @armBodyRoot(OptionalRequestBody) 
  resource: BodyParameter,
): Response | ErrorResponse;

/**
 * @dev The base template for Legacy Azure Resource Manager PATCH Operations.
 * @template HttpParameters The parameter object for the operation.
 * @template BodyParameter The body parameter
 * @template Response The response or union of responses for success.
 * @template ErrorResponse The error response.
 * @template OptionalRequestBody Optional. Indicates whether the request body is optional
 */
op UpdateOperation<
  HttpParameters extends {},
  BodyParameter extends {} | void,
  Response extends {},
  ErrorResponse extends {},
  OptionalRequestBody extends valueof boolean = false
>(
  ...HttpParameters,

  @doc("The resource properties to be updated.")
  @armBodyRoot(OptionalRequestBody)
  properties: BodyParameter,
): Response | ErrorResponse;
