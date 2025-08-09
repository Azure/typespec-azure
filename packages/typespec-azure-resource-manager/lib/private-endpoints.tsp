using Http;
using Rest;
using Azure.ResourceManager.Foundations;
using Azure.ResourceManager.Private;

namespace Azure.ResourceManager;

/**
 * A private endpoint connection resource.
 * Resource providers must declare a private endpoint connection resource type in their provider namespace if
 * they support private endpoint connections
 * @template Description Optional. The documentary description of the private endpoint connection resource name parameter.
 *
 * @example
 * ```ts
 * namespace Microsoft.Contoso;
 * model PrivateEndpointConnection is PrivateEndpointConnectionResource {}
 * alias EmployeeConnectionOps is PrivateEndpoints<PrivateEndpointConnection>;
 * @armResourceOperations
 * interface Employees {
 *  @doc("get a private endpoint connection for resource employee")
 *  getPrivateEndpointConnection is EmployeeConnectionOps.Read<Employee>;
 * }
 * ```
 */
@doc(Description)
@armResourceWithParameter(
  CommonTypes.PrivateEndpointConnectionProperties,
  "privateEndpointConnections",
  "privateEndpointConnectionName"
)
@Http.Private.includeInapplicableMetadataInPayload(false)
model PrivateEndpointConnectionResource<Description extends valueof string = "A private endpoint connection resource">
  is CommonTypes.PrivateEndpointConnection;

/**
 * Operations over private endpoint connection resources.
 * @template PrivateEndpointResource The type of the private endpoint connection resource. You must declare a private endpoint connection resource type in your provider namespace.
 *
 * @example
 * ```ts
 * namespace Microsoft.Contoso;
 * model PrivateEndpointConnection is PrivateEndpointConnectionResource {}
 * alias EmployeeConnectionOps is PrivateEndpoints<PrivateEndpointConnection>;
 * @armResourceOperations
 * interface Employees {
 *  @doc("get a private endpoint connection for resource employee")
 *  getPrivateEndpointConnection is EmployeeConnectionOps.Read<Employee>;
 * }
 * ```
 */
interface PrivateEndpoints<PrivateEndpointResource extends PrivateEndpointConnectionResource> {
  /**
   * @dev List the private endpoint connections over a resource
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
  @listsResource(Resource)
  @segmentOf(PrivateEndpointConnectionParameter)
  @armResourceList(Resource)
  @Private.enforceConstraint(ParentResource, Foundations.Resource)
  ListByParent<
    ParentResource extends Foundations.SimpleResource,
    Resource extends PrivateEndpointConnectionResource = PrivateEndpointResource,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    Parameters extends {} = {},
    Response extends {} = ArmResponse<ResourceListResult<Resource>>,
    Error extends {} = ErrorResponse
  > is ArmReadOperation<
    ResourceInstanceParameters<ParentResource, BaseParameters> & Parameters,
    Response,
    Error
  >;

  /**
   * @dev GET the a private endpoint connection for a particular resource
   * @template ParentResource the parent resource of the PrivateEndpointConnection
   * @template Resource the PrivateEndpointConnection resource being read
   * @template BaseParameters Optional. Allows overriding the operation parameters
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response for the read operation
   * @template Error Optional. The error response, if non-standard.
   */
  @autoRoute
  @doc("Get a {name} PrivateEndpointConnection", ParentResource)
  @get
  @armResourceRead(Resource)
  Read<
    ParentResource extends Foundations.SimpleResource,
    Resource extends PrivateEndpointConnectionResource = PrivateEndpointResource,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    Parameters extends {} = {},
    Response extends {} = ArmResponse<Resource>,
    Error extends {} = ErrorResponse
  > is ArmReadOperation<
    ResourceInstanceParameters<ParentResource, BaseParameters> &
      KeysOf<PrivateEndpointConnectionParameter> &
      Parameters,
    Response,
    Error
  >;

  /**
   * @dev A long-running resource CreateOrUpdate (PUT) for a PrivateEndpointConnection to a resource
   * @template ParentResource the parent resource of the PrivateEndpointConnection
   * @template Resource the PrivateEndpointConnection resource being created or updated
   * @template BaseParameters Optional. Allows overriding the operation parameters
   * @template LroHeaders Optional.  Allows overriding the lro headers returned on resource create
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response for the createOrUpdate operation
   * @template Error Optional. The error response, if non-standard.
   */
  @autoRoute
  @doc("Create a {name} PrivateEndpointConnection", ParentResource)
  @armResourceCreateOrUpdate(Resource)
  @Private.enforceConstraint(ParentResource, Foundations.Resource)
  @Azure.Core.Foundations.Private.defaultFinalStateVia(#["location", "azure-async-operation"])
  @put
  CreateOrUpdateAsync<
    ParentResource extends Foundations.SimpleResource,
    Resource extends PrivateEndpointConnectionResource = PrivateEndpointResource,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    LroHeaders extends TypeSpec.Reflection.Model = ArmAsyncOperationHeader<FinalResult = Resource> &
      Azure.Core.Foundations.RetryAfterHeader,
    Parameters extends {} = {},
    Response extends {} = ArmResourceUpdatedResponse<Resource> | ArmResourceCreatedResponse<
      Resource,
      LroHeaders
    >,
    Error extends {} = ErrorResponse
  > is ArmCreateOperation<
    ResourceInstanceParameters<ParentResource, BaseParameters> &
      KeysOf<PrivateEndpointConnectionParameter> &
      Parameters,
    Resource,
    Response,
    Error
  >;

  /**
   * @dev Synchronous PUT operation for a Private endpoint connection to a resource
   * @template ParentResource the parent resource of the PrivateEndpointConnection
   * @template Resource the PrivateEndpointConnection resource being created or updated
   * @template BaseParameters Optional. Allows overriding the operation parameters
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response for the createOrUpdate operation
   * @template Error Optional. The error response, if non-standard.
   */
  @autoRoute
  @doc("Create a {name} PrivateEndpointConnection", ParentResource)
  @armResourceCreateOrUpdate(Resource)
  @Private.enforceConstraint(ParentResource, Foundations.Resource)
  @put
  CreateOrReplaceSync<
    ParentResource extends Foundations.SimpleResource,
    Resource extends PrivateEndpointConnectionResource = PrivateEndpointResource,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    Parameters extends {} = {},
    Response extends {} = ArmResourceUpdatedResponse<Resource> | ArmResourceCreatedSyncResponse<Resource>,
    Error extends {} = ErrorResponse
  > is ArmCreateOperation<
    ResourceInstanceParameters<ParentResource, BaseParameters> &
      KeysOf<PrivateEndpointConnectionParameter> &
      Parameters,
    Resource,
    Response,
    Error
  >;

  /**
   * @dev A long-running resource CreateOrUpdate (PUT) for a PrivateEndpointConnection to a resource
   * @template ParentResource the parent resource of the PrivateEndpointConnection
   * @template Resource the PrivateEndpointConnection resource being created or updated
   * @template BaseParameters Optional. Allows overriding the operation parameters
   * @template LroHeaders Optional.  Allows overriding the lro headers returned on resource create
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response for the createOrReplace operation
   * @template Error Optional. The error response, if non-standard.
   */
  @Private.enforceConstraint(ParentResource, Foundations.Resource)
  CreateOrReplaceAsync<
    ParentResource extends Foundations.SimpleResource,
    Resource extends PrivateEndpointConnectionResource = PrivateEndpointResource,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    LroHeaders extends TypeSpec.Reflection.Model = ArmAsyncOperationHeader<FinalResult = Resource> &
      Azure.Core.Foundations.RetryAfterHeader,
    Parameters extends {} = {},
    Response extends {} = ArmResourceUpdatedResponse<Resource> | ArmResourceCreatedResponse<
      Resource,
      LroHeaders
    >,
    Error extends {} = ErrorResponse
  > is PrivateEndpoints.CreateOrUpdateAsync<
    ParentResource,
    Resource,
    BaseParameters,
    LroHeaders,
    Parameters,
    Response,
    Error
  >;

  /**
   * A long-running resource update using a custom PATCH payload (Asynchronous) to update a PrivateEndpointConnection to a resource.
   * @template ParentResource the parent resource of the PrivateEndpointConnection
   * @template Resource the PrivateEndpointConnection resource being updated
   * @template PatchModel The input model for the PATCH request
   * @template BaseParameters Optional. Allows overriding the operation parameters
   * @template LroHeaders Optional.  Allows overriding the lro headers returned in the Accepted response
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response for the patch operation
   * @template Error Optional. The error response, if non-standard.
   */
  @autoRoute
  @doc("Update a {name} PrivateEndpointConnection", ParentResource)
  @armResourceUpdate(Resource)
  @Private.enforceConstraint(ParentResource, Foundations.Resource)
  @patch(#{ implicitOptionality: false })
  CustomPatchAsync<
    ParentResource extends Foundations.SimpleResource,
    Resource extends PrivateEndpointConnectionResource = PrivateEndpointResource,
    PatchModel extends TypeSpec.Reflection.Model = PrivateEndpointConnectionUpdate,
    BaseParameters = DefaultBaseParameters<ParentResource>,
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
   * @dev A resource update using a custom PATCH payload (synchronous) to update a PrivateEndpointConnection to a resource
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
  @armResourceUpdate(Resource)
  @Private.enforceConstraint(ParentResource, Foundations.Resource)
  @patch(#{ implicitOptionality: false })
  CustomPatchSync<
    ParentResource extends Foundations.SimpleResource,
    Resource extends PrivateEndpointConnectionResource = PrivateEndpointResource,
    PatchModel extends TypeSpec.Reflection.Model = PrivateEndpointConnectionUpdate,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    Parameters extends {} = {},
    Response extends {} = ArmResponse<Resource>,
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
   * @dev Delete a PrivateEndpointConnection to a resource asynchronously
   * @template ParentResource The parent resource of the PrivateEndpointConnection
   * @template Resource Optional. The PrivateEndpointConnection resource being deleted
   * @template BaseParameters Optional. Allows overriding the parameters for the operation
   * @template LroHeaders Optional. Allows overriding the headers returned in the Accepted response
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response(s) for the delete operation
   * @template Error Optional. The error response, if non-standard.
   */
  @Private.enforceConstraint(ParentResource, Foundations.Resource)
  DeleteAsync<
    ParentResource extends Foundations.SimpleResource,
    Resource extends PrivateEndpointConnectionResource = PrivateEndpointResource,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader &
      Azure.Core.Foundations.RetryAfterHeader,
    Parameters extends {} = {},
    Response extends {} = ArmDeleteAcceptedLroResponse<LroHeaders> | ArmDeletedNoContentResponse,
    Error extends {} = ErrorResponse
  > is PrivateEndpoints.DeleteAsyncBase<
    ParentResource,
    Response,
    Resource,
    BaseParameters,
    Parameters,
    Error
  >;

  /**
   * @dev Delete a PrivateEndpointConnection to a resource synchronously
   * @template ParentResource The parent resource of the PrivateEndpointConnection
   * @template Resource The PrivateEndpointConnection resource being deleted
   * @template BaseParameters Optional. Allows overriding the parameters for the operation
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Response Optional. The success response(s) for the delete operation
   * @template Error Optional. The error response, if non-standard.
   */
  @autoRoute
  @doc("Delete a {name} PrivateEndpointConnection", ParentResource)
  @armResourceDelete(Resource)
  @Private.enforceConstraint(ParentResource, Foundations.Resource)
  @delete
  DeleteSync<
    ParentResource extends Foundations.SimpleResource,
    Resource extends PrivateEndpointConnectionResource = PrivateEndpointResource,
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
   * @dev Delete a PrivateEndpointConnection to a resource asynchronously
   * @template ParentResource The parent resource of the PrivateEndpointConnection
   * @template Response The response type for the operation
   * @template Resource Optional. The PrivateEndpointConnection resource being deleted
   * @template BaseParameters Optional. Allows overriding the parameters for the operation
   * @template Parameters Optional. Additional parameters after the path parameters
   * @template Error Optional. The error response, if non-standard.
   */
  @autoRoute
  @doc("Delete a {name} PrivateEndpointConnection", ParentResource)
  @armResourceDelete(Resource)
  @Private.enforceConstraint(ParentResource, Foundations.Resource)
  @delete
  DeleteAsyncBase<
    ParentResource extends Foundations.SimpleResource,
    Response,
    Resource extends PrivateEndpointConnectionResource = PrivateEndpointResource,
    BaseParameters = DefaultBaseParameters<ParentResource>,
    Parameters extends {} = {},
    Error extends {} = ErrorResponse
  >(
    ...ResourceInstanceParameters<ParentResource, BaseParameters>,
    ...KeysOf<PrivateEndpointConnectionParameter>,
    ...Parameters,
  ): Response | Error;
}

/** PATCH model for private endpoint connections */
model PrivateEndpointConnectionUpdate
  is OptionalProperties<UpdateableProperties<OmitProperties<
    CommonTypes.PrivateEndpointConnection,
    "properties"
  >>> {
  /** The private endpoint connection properties */
  properties?: OptionalProperties<UpdateableProperties<CommonTypes.PrivateEndpointConnectionProperties>>;
}
