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
 * @template Headers Optional.  Allows overriding the Lro headers returned in the response.
 */
model ArmDeleteAcceptedLroResponse<LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader>
  is ArmAcceptedLroResponse<"Resource deletion accepted.", LroHeaders>;

/**
 * @dev The response for synchronous ARM delete ACCEPTED
 */
model ArmDeleteAcceptedResponse is ArmAcceptedResponse<"Resource deletion accepted.">;

/**
 * @dev The standard ACCEPTED response
 * @template TMessage The description of the response status (defaults to `Resource operation accepted`)
 */
@doc(TMessage)
model ArmAcceptedResponse<TMessage extends valueof string = "Resource operation accepted."> {
  ...AcceptedResponse;
  ...Azure.Core.Foundations.RetryAfterHeader;
}

/**
 * @dev The standard ARM response for asynchronous PATCH, POST, and DELETE operations
 * @template Description The description of the response status (defaults to `Resource operation accepted`)
 * @template LroHeaders Optional.  The lro headers that appear in the Accepted response
 */
@doc(Description)
model ArmAcceptedLroResponse<
  Description extends valueof string = "Resource operation accepted.",
  LroHeaders extends TypeSpec.Reflection.Model = ArmLroLocationHeader
> {
  ...AcceptedResponse;
  ...Azure.Core.Foundations.RetryAfterHeader;
  ...LroHeaders;
}

/**
 * Standard ARM operation status response
 * @template Properties Optional resource-specific properties
 * @template StatusValues The set of allowed values for operation status
 */
model ArmOperationStatus<
  Properties extends {} = never,
  StatusValues extends TypeSpec.Reflection.Enum | TypeSpec.Reflection.Union = ResourceProvisioningState
> is ArmResourceBase {
  /** RP-specific properties for the operationStatus resource, only appears when operation ended with Succeeded status */
  @visibility("read")
  properties?: Properties;

  /** The operation status */
  @visibility("read")
  @Azure.Core.lroStatus
  status: StatusValues;

  /** The unique identifier for the operationStatus resource */
  @key
  @path
  @segment("operationStatuses")
  @visibility("read")
  id: Azure.Core.uuid;

  /** The name of the  operationStatus resource */
  @visibility("read")
  name?: string;

  /** Operation start time */
  @visibility("read")
  startTime?: utcDateTime;

  /** Operation complete time */
  @visibility("read")
  endTime?: utcDateTime;

  /** The progress made toward completing the operation */
  @visibility("read")
  percentComplete?: float64;

  /** Errors that occurred if the operation ended with Canceled or Failed status */
  @visibility("read")
  error?: ErrorDetail;
}

/**
 * The standard header for asynchronous operation polling
 *  @template StatusMonitor The status monitor type for lro polling
 *  @template UrlValue The value type of the Azure-AsyncOperation  header
 */
model ArmAsyncOperationHeader<
  StatusMonitor extends {} = ArmOperationStatus,
  UrlValue extends string = string
> {
  /** A link to the status monitor */
  @header("Azure-AsyncOperation")
  @Azure.Core.pollingLocation(Azure.Core.StatusMonitorPollingOptions<StatusMonitor>)
  azureAsyncOperation: UrlValue;
}

/**
 * The default header for lro PUT and DELETE polling
 * @template LroPollingOptions The polling options when polling the url in the location header
 * @template FinalResult The ultimate final result of the logical operation
 * @template UrlValue The value type for the location header
 */
model ArmLroLocationHeader<
  LroPollingOptions extends Azure.Core.PollingOptions = Azure.Core.StatusMonitorPollingOptions<ArmOperationStatus>,
  FinalResult extends {} | void = void,
  UrlValue extends string = string
> {
  /** The Location header contains the URL where the status of the long running operation can be checked. */
  @header("Location")
  @Azure.Core.pollingLocation(LroPollingOptions)
  @Azure.Core.finalLocation(FinalResult)
  location: UrlValue;
}

/**
 * Provide Both Azure-AsyncOperation and Location headers
 * @template StatusMonitor The type of the polling StatusMonitor when following the Azure-AsyncOperation url
 * @template FinalResult The type of the logical result when following the location header
 * @template PollingUrlValue The value type of the link to the status monitor
 * @template FinalUrlValue The value type fo the link to the final result
 */
model ArmCombinedLroHeaders<
  StatusMonitor extends {} = ArmOperationStatus,
  FinalResult extends {} | void = void,
  PollingUrlValue extends string = ResourceLocation<StatusMonitor>,
  FinalUrlValue extends string = string
> {
  /** A link to the status monitor */
  @Azure.Core.pollingLocation(Azure.Core.StatusMonitorPollingOptions<StatusMonitor>)
  @header("Azure-AsyncOperation")
  azureAsyncOperation: PollingUrlValue;

  /** The Location header contains the URL where the status of the long running operation can be checked. */
  @header("Location")
  @Azure.Core.finalLocation(FinalResult)
  location: FinalUrlValue;
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
 * @template LroHeaders Optional. The lro headers returned with a Created response
 */
@doc("Resource '{name}' create operation succeeded", TResource)
model ArmResourceCreatedResponse<
  TResource extends Azure.ResourceManager.Foundations.ArmResource,
  LroHeaders extends TypeSpec.Reflection.Model = {}
> is ArmCreatedResponse<TResource> {
  ...LroHeaders;
}

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
