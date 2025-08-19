import "@typespec/rest";
import "@typespec/http";

namespace Azure.ResourceManager.Legacy;

using Http;
using Azure.ResourceManager.Foundations;
using Rest;

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
@listsResource(Resource)
@segmentOf(PrivateEndpointConnectionParameter)
@armResourceList(Resource)
@Private.enforceConstraint(ParentResource, Foundations.Resource)
op ListSinglePageByParent<
  ParentResource extends Foundations.SimpleResource,
  Resource extends PrivateEndpointConnectionResource,
  BaseParameters = DefaultBaseParameters<ParentResource>,
  Parameters extends {} = {},
  Response extends {} = ArmResponse<ResourceListResult<Resource>>,
  Error extends {} = ErrorResponse
> is ArmReadOperation<
  ResourceInstanceParameters<ParentResource, BaseParameters> & Parameters,
  Response,
  Error
>;
