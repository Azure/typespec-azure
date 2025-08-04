using Http;
using Rest;
using Azure.ResourceManager.Foundations;
using Azure.ResourceManager.Private;

namespace Azure.ResourceManager;

interface PrivateEndpoints {
  /**
   * @dev A resource list operation, at the scope of the resource's parent
   * @template ParentResource the parent resource of the PrivateEndpointConnection
   * @template Resource Optional. The PrivateEndpointConnection resource being listed
   * @template BaseParameters Optional. Allows overriding the operation parameters
   * @template ParentName Optional. The name of the parent resource
   * @template ParentFriendlyName Optional. The friendly name of the parent resource
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response for the list operation
   * @template Error Optional. The error response, if non-standard.
   */
  @doc("List {name} PrivateEndpointConnections", ParentResource)
  @get
  @autoRoute
  @list
  @listsResource(PrivateEndpointConnection)
  @segmentOf(PrivateEndpointConnectionParameter)
  @armResourceList(PrivateEndpointConnection)
  @Private.enforceConstraint(ParentResource, Foundations.Resource)
  ListByParent<
    ParentResource extends Foundations.SimpleResource,
    BaseParameters = DefaultBaseParameters<PrivateEndpointConnection>,
    Parameters extends {} = {},
    Response extends {} = ArmResponse<ResourceListResult<PrivateEndpointConnection>>,
    Error extends {} = ErrorResponse
  > is ArmReadOperation<
    ResourceInstanceParameters<ParentResource, BaseParameters> & Parameters,
    Response,
    Error
  >;

  /**
   * @dev resource GET operation
   * @template ParentResource the parent resource of the PrivateEndpointConnection
   * @template BaseParameters Optional. Allows overriding the operation parameters
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response for the read operation
   * @template Error Optional. The error response, if non-standard.
   */
  @autoRoute
  @doc("Get a {name} PrivateEndpointConnection", ParentResource)
  @get
  @armResourceRead(ParentResource)
  Read<
    ParentResource extends Foundations.SimpleResource,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    Parameters extends {} = {},
    Response extends {} = ArmResponse<PrivateEndpointConnection>,
    Error extends {} = ErrorResponse
  > is ArmReadOperation<
    ResourceInstanceParameters<ParentResource, BaseParameters> &
      KeysOf<PrivateEndpointConnectionParameter> &
      Parameters,
    Response,
    Error
  >;

  /**
   * @dev A long-running resource CreateOrUpdate (PUT)
   * @template ParentResource the parent resource of the PrivateEndpointConnection
   * @template BaseParameters Optional. Allows overriding the operation parameters
   * @template LroHeaders Optional.  Allows overriding the lro headers returned on resource create
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response for the createOrUpdate operation
   * @template Error Optional. The error response, if non-standard.
   */
  @autoRoute
  @doc("Create a {name} PrivateEndpointConnection", ParentResource)
  @armResourceCreateOrUpdate(ParentResource)
  @Private.enforceConstraint(ParentResource, Foundations.Resource)
  @Azure.Core.Foundations.Private.defaultFinalStateVia(#["location", "azure-async-operation"])
  @put
  CreateOrUpdateAsync<
    ParentResource extends Foundations.SimpleResource,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    LroHeaders extends TypeSpec.Reflection.Model = ArmAsyncOperationHeader<FinalResult = PrivateEndpointConnection> &
      Azure.Core.Foundations.RetryAfterHeader,
    Parameters extends {} = {},
    Response extends {} = ArmResourceUpdatedResponse<PrivateEndpointConnection> | ArmResourceCreatedResponse<
      PrivateEndpointConnection,
      LroHeaders
    >,
    Error extends {} = ErrorResponse
  > is ArmCreateOperation<
    ResourceInstanceParameters<ParentResource, BaseParameters> &
      KeysOf<PrivateEndpointConnectionParameter> &
      Parameters,
    PrivateEndpointConnection,
    Response,
    Error
  >;

  /**
   * @dev Synchronous PUT operation for Azure Resource Manager resources
   * @template ParentResource the parent resource of the PrivateEndpointConnection
   * @template BaseParameters Optional. Allows overriding the operation parameters
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response for the createOrUpdate operation
   * @template Error Optional. The error response, if non-standard.
   */
  @autoRoute
  @doc("Create a {name} PrivateEndpointConnection", ParentResource)
  @armResourceCreateOrUpdate(ParentResource)
  @Private.enforceConstraint(ParentResource, Foundations.Resource)
  @put
  CreateOrReplaceSync<
    ParentResource extends Foundations.SimpleResource,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    Parameters extends {} = {},
    Response extends {} = ArmResourceUpdatedResponse<PrivateEndpointConnection> | ArmResourceCreatedSyncResponse<PrivateEndpointConnection>,
    Error extends {} = ErrorResponse
  > is ArmCreateOperation<
    ResourceInstanceParameters<ParentResource, BaseParameters> &
      KeysOf<PrivateEndpointConnectionParameter> &
      Parameters,
    PrivateEndpointConnection,
    Response,
    Error
  >;

  /**
   * @dev A long-running resource CreateOrUpdate (PUT)
   * @template ParentResource the parent resource of the PrivateEndpointConnection
   * @template BaseParameters Optional. Allows overriding the operation parameters
   * @template LroHeaders Optional.  Allows overriding the lro headers returned on resource create
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response for the createOrReplace operation
   * @template Error Optional. The error response, if non-standard.
   */
  @Private.enforceConstraint(ParentResource, Foundations.Resource)
  CreateOrReplaceAsync<
    ParentResource extends Foundations.SimpleResource,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    LroHeaders extends TypeSpec.Reflection.Model = ArmAsyncOperationHeader<FinalResult = PrivateEndpointConnection> &
      Azure.Core.Foundations.RetryAfterHeader,
    Parameters extends {} = {},
    Response extends {} = ArmResourceUpdatedResponse<ParentResource> | ArmResourceCreatedResponse<
      ParentResource,
      LroHeaders
    >,
    Error extends {} = ErrorResponse
  > is ArmResourceCreateOrUpdateAsync<
    ParentResource,
    BaseParameters,
    LroHeaders,
    Parameters,
    Response,
    Error
  >;

  /**
   * A long-running resource update using a custom PATCH payload (Asynchronous)
   * @template ParentResource the parent resource of the PrivateEndpointConnection
   * @template PatchModel The input model for the PATCH request
   * @template BaseParameters Optional. Allows overriding the operation parameters
   * @template LroHeaders Optional.  Allows overriding the lro headers returned in the Accepted response
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response for the patch operation
   * @template Error Optional. The error response, if non-standard.
   */
  @autoRoute
  @doc("Update a {name} PrivateEndpointConnection", ParentResource)
  @armResourceUpdate(ParentResource)
  @Private.enforceConstraint(ParentResource, Foundations.Resource)
  @patch(#{ implicitOptionality: false })
  CustomPatchAsync<
    ParentResource extends Foundations.SimpleResource,
    PatchModel extends TypeSpec.Reflection.Model = PrivateEndpointConnectionUpdate,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader<
      Azure.Core.StatusMonitorPollingOptions<ArmOperationStatus>,
      PrivateEndpointConnection,
      string
    > &
      Azure.Core.Foundations.RetryAfterHeader,
    Parameters extends {} = {},
    Response extends {} = ArmResponse<PrivateEndpointConnection> | ArmAcceptedLroResponse<
      "Resource update request accepted.",
      LroHeaders
    >,
    Error extends {} = ErrorResponse
  > is ArmUpdateOperation<
    ResourceInstanceParameters<ParentResource, BaseParameters> &
      KeysOf<PrivateEndpointConnectionParameter> &
      Parameters,
    PatchModel,
    Response,
    Error
  >;

  /**
   * @dev A resource update using a custom PATCH payload (synchronous)
   * @template ParentResource The parent resource of the PrivateEndpointConnection
   * @template Resource Optional. The PrivateEndpointConnection resource being patched
   * @template PatchModel The input model for the PATCH request
   * @template BaseParameters Optional. Allows overriding the operation parameters
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response for the patch operation
   * @template Error Optional. The error response, if non-standard.
   */
  @autoRoute
  @doc("Update a {name PrivateEndpointConnection}", ParentResource)
  @armResourceUpdate(CommonTypes.PrivateEndpointConnection)
  @Private.enforceConstraint(ParentResource, Foundations.Resource)
  @patch(#{ implicitOptionality: false })
  CustomPatchSync<
    ParentResource extends Foundations.SimpleResource,
    PatchModel extends TypeSpec.Reflection.Model = PrivateEndpointConnectionUpdate,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    Parameters extends {} = {},
    Response extends {} = ArmResponse<PrivateEndpointConnection>,
    Error extends {} = ErrorResponse
  > is ArmUpdateOperation<
    ResourceInstanceParameters<ParentResource, BaseParameters> &
      KeysOf<PrivateEndpointConnectionParameter> &
      Parameters,
    PatchModel,
    Response,
    Error
  >;

  /**
   * @dev Delete a resource asynchronously.  DEPRECATED: Use ArmResourceDeleteWithoutOkAsync instead
   * @template ParentResource The parent resource of the PrivateEndpointConnection
   * @template Resource Optional. The PrivateEndpointConnection resource being deleted
   * @template BaseParameters Optional. Allows overriding the parameters for the operation
   * @template LroHeaders Optional. Allows overriding the headers in the Accepted response
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response(s) for the delete operation
   * @template Error Optional. The error response, if non-standard.
   */
  #deprecated "Use 'ArmResourceDeleteWithoutOkAsync' instead"
  @Private.enforceConstraint(ParentResource, Foundations.Resource)
  DeleteAsync<
    ParentResource extends Foundations.SimpleResource,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader &
      Azure.Core.Foundations.RetryAfterHeader,
    Parameters extends {} = {},
    Response extends {} = ArmDeletedResponse | ArmDeleteAcceptedLroResponse<LroHeaders> | ArmDeletedNoContentResponse,
    Error extends {} = ErrorResponse
  > is PrivateEndpoints.DeleteAsyncBase<
    ParentResource,
    Response,
    BaseParameters,
    Parameters,
    Error
  >;

  /**
   * @dev Delete a resource asynchronously
   * @template ParentResource The parent resource of the PrivateEndpointConnection
   * @template BaseParameters Optional. Allows overriding the parameters for the operation
   * @template LroHeaders Optional. Allows overriding the headers returned in the Accepted response
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response(s) for the delete operation
   * @template Error Optional. The error response, if non-standard.
   */
  @Private.enforceConstraint(ParentResource, Foundations.Resource)
  DeleteWithoutOkAsync<
    ParentResource extends Foundations.SimpleResource,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader &
      Azure.Core.Foundations.RetryAfterHeader,
    Parameters extends {} = {},
    Response extends {} = ArmDeleteAcceptedLroResponse<LroHeaders> | ArmDeletedNoContentResponse,
    Error extends {} = ErrorResponse
  > is PrivateEndpoints.DeleteAsyncBase<
    ParentResource,
    Response,
    BaseParameters,
    Parameters,
    Error
  >;

  /**
   * @dev Delete a resource synchronously
   * @template ParentResource The parent resource of the PrivateEndpointConnection
   * @template BaseParameters Optional. Allows overriding the parameters for the operation
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response(s) for the delete operation
   * @template Error Optional. The error response, if non-standard.
   */
  @autoRoute
  @doc("Delete a {name} PrivateEndpointConnection", ParentResource)
  @armResourceDelete(CommonTypes.PrivateEndpointConnection)
  @Private.enforceConstraint(ParentResource, Foundations.Resource)
  @delete
  DeleteSync<
    ParentResource extends Foundations.SimpleResource,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    Parameters extends {} = {},
    Response extends {} = ArmDeletedResponse | ArmDeletedNoContentResponse,
    Error = ErrorResponse
  >(
    ...ResourceInstanceParameters<ParentResource, BaseParameters>,
    ...KeysOf<PrivateEndpointConnectionParameter>,
    ...Parameters,
  ): Response | Error;

  /**
   * @dev Delete a resource asynchronously
   * @template Resource The resource being deleted
   * @template Response The response type for the operation
   * @template BaseParameters Optional. Allows overriding the parameters for the operation
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Error Optional. The error response, if non-standard.
   */
  @autoRoute
  @doc("Delete a {name} PrivateEndpointConnection", ParentResource)
  @armResourceDelete(PrivateEndpointConnection)
  @Private.enforceConstraint(ParentResource, Foundations.Resource)
  @delete
  DeleteAsyncBase<
    ParentResource extends Foundations.SimpleResource,
    Response,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    Parameters extends {} = {},
    Error extends {} = ErrorResponse
  >(
    ...ResourceInstanceParameters<ParentResource, BaseParameters>,
    ...KeysOf<PrivateEndpointConnectionParameter>,
    ...Parameters,
  ): Response | Error;
}

model PrivateEndpointConnectionUpdate
  is OptionalProperties<UpdateableProperties<CommonTypes.PrivateEndpointConnection>>;
