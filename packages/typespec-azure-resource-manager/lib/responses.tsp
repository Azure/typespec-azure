using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using Azure.ResourceManager.Foundations;
using Azure.ResourceManager.Private;

namespace Azure.ResourceManager;

/**
 * The ARM synchronous OK response
 * @template T The contents of the response body
 */
@doc("ARM operation completed successfully.")
model ArmResponse<T> {
  ...OkResponse;
  ...Body<T>;
}

/**
 * The ARM 201 response for a resource
 * @template T The contents of the response body
 */
@doc("ARM create operation completed successfully.")
model ArmCreatedResponse<T> {
  ...CreatedResponse;
  ...Azure.Core.Foundations.RetryAfterHeader;
  ...Body<T>;
}

/**
 * The response for synchronous delete of a resource
 */
@doc("Resource deleted successfully.")
model ArmDeletedResponse {
  ...OkResponse;
}

/**
 * @dev The response for asynchronous ARM delete ACCEPTED
 */
model ArmDeleteAcceptedLroResponse is ArmAcceptedLroResponse<"Resource deletion accepted.">;

/**
 * @dev The response for synchronous ARM delete ACCEPTED
 */
model ArmDeleteAcceptedResponse is ArmAcceptedResponse<"Resource deletion accepted.">;

/**
 * The standard ACCEPTED response
 * @template TMessage The description of the response status (defaults to `Resource operation accepted`)
 */
@doc(TMessage)
model ArmAcceptedResponse<TMessage extends valueof string = "Resource operation accepted."> {
  ...AcceptedResponse;
  ...Azure.Core.Foundations.RetryAfterHeader;
}

/** Legacy representation for resource location using string instead of url */
@TypeSpec.Rest.Private.resourceLocation(TResponse)
scalar StringResourceLink<TResponse extends TypeSpec.Reflection.Model = {}> extends string;

/**
 * The standard ARM response for asynchronous PATCH, POST, and DELETE operations
 * @template TMessage The description of the response status (defaults to `Resource operation accepted`)
 */
@doc(TMessage)
model ArmAcceptedLroResponse<
  TMessage extends valueof string = "Resource operation accepted.",
  TLroResponse extends TypeSpec.Reflection.Model = {}
> is ArmAcceptedResponse<TMessage> {
  @doc("The Location header contains the URL where the status of the long running operation can be checked.")
  @header("Location")
  location?: StringResourceLink<TLroResponse>;
}

/**
 * @dev ARM response for a properly formed delete request, with no resource found
 */
model ArmDeletedNoContentResponse is ArmNoContentResponse<"Resource deleted successfully.">;

/**
 * Standard ARM NoContent (204) response
 * @template TMessage The description of the response status (defaults to `Operation completed successfully`)
 */
@doc(TMessage)
model ArmNoContentResponse<TMessage extends valueof string = "Operation completed successfully."> {
  ...NoContentResponse;
}

/** Resource update operation succeeded
 * @template TResource The resource being updated
 */
@doc("Resource '{name}' update operation succeeded", TResource)
model ArmResourceUpdatedResponse<TResource extends Azure.ResourceManager.Foundations.ArmResource>
  is ArmResponse<TResource>;

/** Resource create operation succeeded
 * @template TResource The resource being updated
 */
@doc("Resource '{name}' create operation succeeded", TResource)
model ArmResourceCreatedResponse<TResource extends Azure.ResourceManager.Foundations.ArmResource>
  is ArmCreatedResponse<TResource>;

/** Resource synchronous create operation succeeded
 * @template TResource The resource being updated
 */
@doc("Resource '{name}' create operation succeeded", TResource)
model ArmResourceCreatedSyncResponse<TResource extends Azure.ResourceManager.Foundations.ArmResource>
  is Body<TResource> {
  ...CreatedResponse;
}

/**
 * The standard ARM error response
 */
@error
@armCommonDefinition("ErrorResponse", Azure.ResourceManager.CommonTypes.Versions.v3)
@armCommonDefinition("ErrorResponse", Azure.ResourceManager.CommonTypes.Versions.v4)
@armCommonDefinition("ErrorResponse", Azure.ResourceManager.CommonTypes.Versions.v5)
@doc("Common error response for all Azure Resource Manager APIs to return error details for failed operations.")
model ErrorResponse {
  @doc("The error object.")
  error?: ErrorDetail;
}
