import "@typespec/rest";
import "@typespec/http";

namespace Azure.ResourceManager.Legacy;

using Http;
using Azure.ResourceManager.Private;
using Rest;

/**
 * An operation template used to build extension resource operations using non-standard paths.
 * @template TargetParameters The path parameters for the target resource
 * @template ExtensionParentParameters Parent parameters of the extension resource
 * @template ExtensionInstanceParameters The instance parameters of the extension resource
 */
@doc("")
interface ExtensionOperations<
  TargetParameters extends {},
  ExtensionParentParameters extends {},
  ExtensionInstanceParameters extends {}
> {
  /**
   * A long-running resource CreateOrUpdate (PUT)
   * @template Resource the resource being created or updated
   * @template LroHeaders Optional.  Allows overriding the lro headers returned on resource create
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response(s) for the PUT operation
   * @template OptionalRequestBody Optional. Indicates whether the request body is optional
   * @template ErrorType Optional. The error response, if non-standard.
   * @template RouteOptions Optional. The route options for the operation.
   */
  @armOperationRoute(RouteOptions)
  @doc("Create a {name}", Resource)
  @armResourceCreateOrUpdate(Resource)
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
    ErrorType extends {} = ErrorResponse,
    RouteOptions extends valueof ArmRouteOptions = #{ useStaticRoute: false }
  >(
    ...TargetParameters,
    ...ExtensionInstanceParameters,
    ...Parameters,
    @doc("Resource create parameters.") @armBodyRoot(OptionalRequestBody) resource: Resource,
  ): Response | ErrorType;

  /**
   * A synchronous resource CreateOrUpdate (PUT)
   * @template Resource the resource being created or updated
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response(s) for the PUT operation
   * @template OptionalRequestBody Optional. Indicates whether the request body is optional
   * @template ErrorType Optional. The error response, if non-standard.
   * @template RouteOptions Optional. The route options for the operation.
   */
  #suppress "@azure-tools/typespec-azure-core/no-private-usage"
  @armOperationRoute(RouteOptions)
  @doc("Create a {name}", Resource)
  @armResourceCreateOrUpdate(Resource)
  @put
  CreateOrUpdateSync<
    Resource extends Foundations.SimpleResource,
    Parameters extends {} = {},
    Response extends {} = ArmResourceUpdatedResponse<Resource> | ArmResourceCreatedSyncResponse<Resource>,
    OptionalRequestBody extends valueof boolean = false,
    ErrorType extends {} = ErrorResponse,
    RouteOptions extends valueof ArmRouteOptions = #{ useStaticRoute: false }
  >(
    ...TargetParameters,
    ...ExtensionInstanceParameters,
    ...Parameters,
    @doc("Resource create parameters.") @armBodyRoot(OptionalRequestBody) resource: Resource,
  ): Response | ErrorType;

  /**
   * A long-running resource Update (PATCH)
   * @template Resource the resource being created or updated
   * @template PatchModel the PATCH request model
   * @template LroHeaders Optional.  Allows overriding the lro headers returned on resource create
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response(s) for the PATCH operation
   * @template OptionalRequestBody Optional. Indicates whether the request body is optional
   * @template ErrorType Optional. The error response, if non-standard.
   * @template RouteOptions Optional. The route options for the operation.
   */
  @armOperationRoute(RouteOptions)
  @doc("Update a {name}", Resource)
  @armResourceUpdate(Resource)
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
    ErrorType extends {} = ErrorResponse,
    RouteOptions extends valueof ArmRouteOptions = #{ useStaticRoute: false }
  >(
    ...TargetParameters,
    ...ExtensionInstanceParameters,
    ...Parameters,
    @doc("Resource create parameters.") @armBodyRoot(OptionalRequestBody) properties: PatchModel,
  ): Response | ErrorType;

  /**
   * A synchronous resource Update (PATCH)
   * @template Resource the resource being created or updated
   * @template PatchModel the PATCH request model
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response(s) for the PATCH operation
   * @template OptionalRequestBody Optional. Indicates whether the request body is optional
   * @template ErrorType Optional. The error response, if non-standard.
   * @template RouteOptions Optional. The route options for the operation.
   */
  @armOperationRoute(RouteOptions)
  @doc("Update a {name}", Resource)
  @armResourceUpdate(Resource)
  @patch(#{ implicitOptionality: false })
  CustomPatchSync<
    Resource extends Foundations.SimpleResource,
    PatchModel extends {} = Azure.ResourceManager.Foundations.TagsUpdateModel<Resource>,
    Parameters extends {} = {},
    Response extends {} = ArmResponse<Resource>,
    OptionalRequestBody extends valueof boolean = false,
    ErrorType extends {} = ErrorResponse,
    RouteOptions extends valueof ArmRouteOptions = #{ useStaticRoute: false }
  >(
    ...TargetParameters,
    ...ExtensionInstanceParameters,
    ...Parameters,
    @doc("Resource create parameters.") @armBodyRoot(OptionalRequestBody) properties: PatchModel,
  ): Response | ErrorType;

  /**
   * Delete a resource asynchronously
   * @template Resource The resource being deleted
   * @template LroHeaders The lro headers for the operation
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response(s) for the delete operation
   * @template ErrorType Optional. The error response, if non-standard.
   * @template RouteOptions Optional. The route options for the operation.
   */
  #suppress "@azure-tools/typespec-azure-core/no-response-body" "Valid"
  @armOperationRoute(RouteOptions)
  @doc("Delete a {name}", Resource)
  @delete
  @deletesResource(Resource)
  @armResourceDelete(Resource)
  DeleteWithoutOkAsync<
    Resource extends Foundations.SimpleResource,
    LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader &
      Azure.Core.Foundations.RetryAfterHeader,
    Parameters extends {} = {},
    Response extends {} = ArmDeleteAcceptedLroResponse<LroHeaders> | ArmDeletedNoContentResponse,
    ErrorType extends {} = ErrorResponse,
    RouteOptions extends valueof ArmRouteOptions = #{ useStaticRoute: false }
  >(...TargetParameters, ...ExtensionInstanceParameters, ...Parameters): Response | ErrorType;

  /**
   * Delete a resource synchronously
   * @template Resource The resource being deleted
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response(s) for the delete operation
   * @template ErrorType Optional. The error response, if non-standard.
   * @template RouteOptions Optional. The route options for the operation.
   */
  #suppress "@azure-tools/typespec-azure-core/no-response-body" "Valid"
  @armOperationRoute(RouteOptions)
  @doc("Delete a {name}", Resource)
  @delete
  @deletesResource(Resource)
  @armResourceDelete(Resource)
  DeleteSync<
    Resource extends Foundations.SimpleResource,
    Parameters extends {} = {},
    Response extends {} = ArmDeletedResponse | ArmDeletedNoContentResponse,
    ErrorType extends {} = ErrorResponse,
    RouteOptions extends valueof ArmRouteOptions = #{ useStaticRoute: false }
  >(...TargetParameters, ...ExtensionInstanceParameters, ...Parameters): Response | ErrorType;

  /**
   * @dev Get a resource
   * @template Resource The resource being read
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response for a get operation.
   * @template ErrorType Optional. The error response, if non-standard.
   * @template RouteOptions Optional. The route options for the operation.
   */
  @armOperationRoute(RouteOptions)
  @doc("Get a {name}", Resource)
  @get
  @readsResource(Resource)
  @armResourceRead(Resource)
  Read<
    Resource extends Foundations.SimpleResource,
    Parameters extends {} = {},
    Response extends {} = ArmResponse<Resource>,
    ErrorType extends {} = ErrorResponse,
    RouteOptions extends valueof ArmRouteOptions = #{ useStaticRoute: false }
  >(...TargetParameters, ...ExtensionInstanceParameters, ...Parameters): Response | ErrorType;

  /**
   * Check a resource's existence via HEAD operation
   * @template Resource The resource being checked
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response for a head operation (by default NoContent or NotFound response).
   * @template ErrorType Optional. The error response, if non-standard.
   * @template RouteOptions Optional. The route options for the operation.
   */
  @armOperationRoute(RouteOptions)
  @doc("Check for the existence of a {name}", Resource)
  @head
  CheckExistence<
    Resource extends Foundations.SimpleResource,
    Parameters extends {} = {},
    Response extends {} = ArmResourceExistsResponse | ArmResourceNotFoundResponse,
    ErrorType extends {} = ErrorResponse,
    RouteOptions extends valueof ArmRouteOptions = #{ useStaticRoute: false }
  > is Foundations.ArmReadOperation<
    TargetParameters & ExtensionInstanceParameters & Parameters,
    Response,
    ErrorType
  >;
  /**
   * List a resource
   * @template Resource The resource being listed
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The response returned by the list
   * @template ErrorType Optional. The error response, if non-standard.
   * @template RouteOptions Optional. The route options for the operation.
   */
  @armOperationRoute(RouteOptions)
  @doc("List a {name}", Resource)
  @get
  @listsResource(Resource)
  @armResourceList(Resource)
  List<
    Resource extends Foundations.SimpleResource,
    Parameters extends {} = {},
    Response extends {} = ArmResponse<ResourceListResult<Resource>>,
    ErrorType extends {} = ErrorResponse,
    RouteOptions extends valueof ArmRouteOptions = #{ useStaticRoute: false }
  >(...TargetParameters, ...ExtensionParentParameters, ...Parameters): Response | ErrorType;

  /**
   * A synchronous resource action.
   * @template Resource The resource being acted upon
   * @template Request The request model for the action
   * @template Response The response model for the action
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template OptionalRequestBody Optional. Indicates whether the request body is optional
   * @template ErrorType Optional. The error response, if non-standard.
   * @template RouteOptions Optional. The route options for the operation.
   */
  @doc("")
  @armOperationRoute(RouteOptions)
  @armResourceAction(Resource)
  @Private.enforceConstraint(Resource, Foundations.Resource)
  @post
  @returnsDoc("Azure operation completed successfully.")
  ActionSync<
    Resource extends Foundations.SimpleResource,
    Request extends TypeSpec.Reflection.Model | void,
    Response extends TypeSpec.Reflection.Model | void,
    Parameters extends {} = {},
    OptionalRequestBody extends valueof boolean = false,
    ErrorType extends {} = ErrorResponse,
    RouteOptions extends valueof ArmRouteOptions = #{ useStaticRoute: false }
  >(
    ...TargetParameters,
    ...ExtensionInstanceParameters,
    ...Parameters,

    @doc("The content of the action request")
    @armBodyRoot(OptionalRequestBody)
    body: Request,
  ): Response | ErrorType;

  /**
   * A long-running resource action.
   * @template Resource The resource being acted upon
   * @template Request The request model for the action
   * @template Result The result model for the action
   * @template LroHeaders Optional. Allows overriding the headers returned in the Accepted response
   * @template Response The full response union of the action
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template OptionalRequestBody Optional. Indicates whether the request body is optional
   * @template ErrorType Optional. The error response, if non-standard.
   * @template RouteOptions Optional. The route options for the operation.
   */
  #suppress "@azure-tools/typespec-azure-core/no-response-body" "ARM"
  @doc("")
  @armOperationRoute(RouteOptions)
  @armResourceAction(Resource)
  @Private.enforceConstraint(Resource, Foundations.Resource)
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
    ErrorType extends {} = ErrorResponse,
    RouteOptions extends valueof ArmRouteOptions = #{ useStaticRoute: false }
  >(
    ...TargetParameters,
    ...ExtensionInstanceParameters,
    ...Parameters,

    @doc("The content of the action request")
    @armBodyRoot(OptionalRequestBody)
    body: Request,
  ): Response | ErrorType;
}
