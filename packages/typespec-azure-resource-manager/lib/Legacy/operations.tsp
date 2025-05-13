using Foundations;
using Http;
using Rest;

namespace Azure.ResourceManager.Legacy;

/**
 * A long-running resource update using a custom PATCH payload (Asynchronous)
 * @template Resource the resource being patched
 * @template PatchModel The input model for the PATCH request
 * @template BaseParameters Optional. Allows overriding the operation parameters
 * @template LroHeaders Optional.  Allows overriding the lro headers returned in the Accepted response
 * @template Parameters Optional. Additional parameters after the path parameters
 * @template Response Optional. The success response for the patch operation
 * @template Error Optional. The error response, if non-standard.
 * @template RequestBody Optional. ENables changing the name, documentation, or optionality of the request body parameter
 */
@autoRoute
@doc("Update a {name}", Resource)
@armResourceUpdate(Resource)
@Private.enforceConstraint(Resource, Foundations.Resource)
@patch(#{ implicitOptionality: true })
op ArmCustomPatchAsync<
  Resource extends Foundations.Resource,
  PatchModel extends TypeSpec.Reflection.Model = TagsUpdateModel<Resource>,
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
  RequestBody extends {} = {
    @doc("The resource properties to be updated.") @bodyRoot properties: PatchModel;
  }
> is ArmUpdateOperation<
  ResourceInstanceParameters<Resource, BaseParameters> & Parameters,
  PatchModel,
  Response,
  Error,
  RequestBody
>;

/**
 * A resource update using a custom PATCH payload (synchronous)
 * @template Resource the resource being patched
 * @template PatchModel The input model for the PATCH request
 * @template BaseParameters Optional. Allows overriding the operation parameters
 * @template Parameters Optional. Additional parameters after the path parameters
 * @template Response Optional. The success response for the patch operation
 * @template Error Optional. The error response, if non-standard.
 * @template RequestBody Optional. ENables changing the name, documentation, or optionality of the request body parameter
 */
@autoRoute
@doc("Update a {name}", Resource)
@armResourceUpdate(Resource)
@Private.enforceConstraint(Resource, Foundations.Resource)
@patch(#{ implicitOptionality: true })
op ArmCustomPatchSync<
  Resource extends Foundations.Resource,
  PatchModel extends TypeSpec.Reflection.Model = TagsUpdateModel<Resource>,
  BaseParameters = DefaultBaseParameters<Resource>,
  Parameters extends {} = {},
  Response extends {} = ArmResponse<Resource>,
  Error extends {} = ErrorResponse,
  RequestBody extends {} = {
    @doc("The resource properties to be updated.") @bodyRoot properties: PatchModel;
  }
> is ArmUpdateOperation<
  ResourceInstanceParameters<Resource, BaseParameters> & Parameters,
  PatchModel,
  Response,
  Error,
  RequestBody
>;
