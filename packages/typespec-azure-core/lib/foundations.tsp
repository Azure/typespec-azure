import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "./traits.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.Core.Traits;
using Azure.Core.Traits.Private;

namespace Azure.Core.Foundations;

/**
 * Enum describing allowed operation states.
 */
@lroStatus
enum OperationState {
  @doc("The operation has not started.")
  NotStarted,

  @doc("The operation is in progress.")
  Running,

  @doc("The operation has completed successfully.")
  Succeeded,

  @doc("The operation has failed.")
  Failed,

  @doc("The operation has been canceled by the user.")
  Canceled,
}

/**
 * Provides status details for long running operations.
 * @template TStatusResult The type of the operation status result.
 * @template TStatusError The type of the operation status error. If not provided, the default error is used.
 */
@doc("Provides status details for long running operations.")
model OperationStatus<TStatusResult = never, TStatusError = Foundations.Error> {
  @key("operationId")
  @doc("The unique ID of the operation.")
  id: string;

  @doc("The status of the operation")
  status: OperationState;

  @doc("Error object that describes the error when status is \"Failed\".")
  error?: TStatusError;

  @doc("The result of the operation.")
  result?: TStatusResult;
}

/**
 * Conveys the resource instance to an operation as a request body.
 * @template T The type of the resource instance.
 */
@added(Azure.Core.Versions.v1_0_Preview_2)
@doc("Conveys the resource instance to an operation as a request body.")
model ResourceBody<T> {
  @doc("The resource instance.")
  @body
  resource: T;
}

// TODO: There is a ARM linter rule that verifies that
// there is no response body. However, long running
// operations are allowed to have it.
alias ResourceCreatedResponse<T extends TypeSpec.Reflection.Model> = TypeSpec.Http.Response<201> &
  T;

alias ResourceOkResponse<T> = TypeSpec.Http.Response<200> & T;

alias ResourceCreatedOrOkResponse<T extends TypeSpec.Reflection.Model> = ResourceCreatedResponse<T> | ResourceOkResponse<T>;

/**
 * Response describing the location of a created resource.
 * @template T The type of the created resource.
 */
model LocationOfCreatedResourceResponse<T extends TypeSpec.Reflection.Model>
  is TypeSpec.Http.CreatedResponse {
  @finalLocation
  @TypeSpec.Http.header("Location")
  location: ResourceLocation<T>;
}

/**
 * Response describing the location of a resource created with a service-provided name.
 * @template T The type of the created resource.
 */
model LocationOfCreatedResourceWithServiceProvidedNameResponse<T extends TypeSpec.Reflection.Model>
  is TypeSpec.Http.AcceptedResponse {
  @finalLocation
  @TypeSpec.Http.header("Location")
  location: ResourceLocation<T>;
}

/**
 * Metadata for long running operation status monitor locations.
 * @template TStatusResult The type of the operation status result.
 */
@doc("Metadata for long running operation status monitor locations")
model LongRunningStatusLocation<TStatusResult = never> {
  @pollingLocation
  @doc("The location for monitoring the operation state.")
  @TypeSpec.Http.header("Operation-Location")
  operationLocation: ResourceLocation<OperationStatus<TStatusResult>>;
}

alias AcceptedResponse<T = {}> = TypeSpec.Http.AcceptedResponse & T;

/**
 * A response containing error details.
 * @template TError The type of the error object.
 */
@error
@doc("A response containing error details.")
model ErrorResponseBase<TError> {
  @doc("The error object.")
  error: TError;

  @header("x-ms-error-code")
  @doc("String error code indicating what went wrong.")
  errorCode?: string;
}

model ErrorResponse is ErrorResponseBase<Error>;

@doc("The ApiVersion query parameter.")
model ApiVersionParameter {
  @query("api-version")
  @minLength(1)
  @doc("The API version to use for this operation.")
  apiVersion: string;
}

@doc("The retry-after envelope.")
model RetryAfterHeader {
  @doc("The Retry-After header can indicate how long the client should wait before polling the operation status.")
  @header("Retry-After")
  retryAfter?: int32;
}

@doc("The error object.")
model Error {
  @doc("One of a server-defined set of error codes.")
  code: string;

  @doc("A human-readable representation of the error.")
  message: string;

  @doc("The target of the error.")
  target?: string;

  #suppress "@azure-tools/typespec-providerhub/no-identifier-property-in-array-item" "Error items have no unique identifier."
  @doc("An array of details about specific errors that led to this reported error.")
  details?: Error[];

  @doc("An object containing more specific information than the current object about the error.")
  innererror?: InnerError;
}

@doc("An object containing more specific information about the error. As per Microsoft One API guidelines - https://github.com/Microsoft/api-guidelines/blob/vNext/Guidelines.md#7102-error-condition-responses.")
model InnerError {
  @doc("One of a server-defined set of error codes.")
  code?: string;

  @doc("Inner error.")
  @projectedName("csharp", "InnerErrorObject")
  innererror?: InnerError;
}

/**
 * Version of a model for a create or replace operation which only includes updateable properties.
 * @template TResource The type of the resource.
 */
@omitKeyProperties
model ResourceCreateOrReplaceModel<TResource extends TypeSpec.Reflection.Model>
  is UpdateableProperties<DefaultKeyVisibility<TResource, "read">>;

/**
 * Collection of properties from a resource that are visible to create or update scopes.
 * @template TResource The type of the resource.
 */
@withVisibility("create", "update")
model CreateableAndUpdateableProperties<TResource> {
  ...TResource;
}

/**
 * Version of a model for a create or update operation which only includes updateable properties.
 * @template TResource The type of the resource.
 */
@omitKeyProperties
model ResourceCreateOrUpdateModel<TResource>
  is OptionalProperties<CreateableAndUpdateableProperties<DefaultKeyVisibility<TResource, "read">>>;

/**
 * Version of a model for an update operation which only includes updateable properties.
 * @template TResource The type of the resource.
 */
@omitKeyProperties
model ResourceUpdateModel<TResource>
  is OptionalProperties<UpdateableProperties<DefaultKeyVisibility<TResource, "read">>>;

/**
 * A model containing the keys of the provided resource.
 * @template TResource The type of the resource.
 */
@copyResourceKeyParameters
model ItemKeysOf<TResource> {}

/**
 * A model containing the collection keys of the provided resource's parent resource.
 * @template TResource The type of the resource.
 */
@copyResourceKeyParameters("parent")
model CollectionKeysOf<TResource> {}

/**
 * A model describing a set of custom request parameters.
 * @template TCustom An object describing custom request parameters.
 */
@Private.spreadCustomParameters(TCustom)
model CustomParameters<TCustom extends TypeSpec.Reflection.Model> {}

/**
 * A model describing a set of custom response properties.
 * @template TCustom An object describing custom response properties.
 */
@Private.spreadCustomResponseProperties(TCustom)
model CustomResponseFields<TCustom extends TypeSpec.Reflection.Model> {}

/**
 * A model describing a customized page of resources.
 * @template TResource The type of the resource.
 * @template Traits Traits which apply to the page.
 */
@pagedResult
@friendlyName("Paged{name}", TResource)
@doc("Paged collection of {name} items", TResource)
model CustomPage<
  TResource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> {
  @doc("The {name} items on this page", TResource)
  @items
  value: TResource[];

  @doc("The link to the next page of items")
  @nextLink
  nextLink?: ResourceLocation<TResource>;

  // Include custom response fields
  ...TraitProperties<Traits, TraitLocation.Response, TraitContext.List>;
}

/**
 * The expected shape of model types passed to the TCustom parameter of operation signatures.
 */
@doc("The expected shape of model types passed to the TCustom parameter of operation signatures.")
model CustomizationFields {
  @doc("An object containing custom parameters that will be included in the operation.")
  parameters?: {};

  @doc("An object containing custom properties that will be included in the response.")
  response?: {};
}

// Basic Operation Shapes

/**
 * The most basic operation.
 * @template TParams Object describing the request parameters of the operation.
 * @template TResponse Object describing the response properties of the operation.
 * @template Traits Traits which apply to the operation.
 * @template TErrorResponse The type of the error response. If not provided, the default error response type will be used.
 */
op Operation<
  TParams extends TypeSpec.Reflection.Model,
  TResponse,
  Traits extends TypeSpec.Reflection.Model = {},
  TErrorResponse = Azure.Core.Foundations.ErrorResponse
>(
  ...TraitProperties<
    Traits & VersionParameterTrait<ApiVersionParameter>,
    TraitLocation.ApiVersionParameter
  >,
  ...TParams,
): TResponse | TErrorResponse;

/**
 * Long-running operation.
 * @template TParams Object describing the request parameters of the operation.
 * @template TResponse Object describing the response properties of the operation. If not provided, the AcceptedResponse type will be used.
 * @template Traits Traits which apply to the operation.
 * @template TErrorResponse The type of the error response. If not provided, the default error response type will be used.
 */
#suppress "@azure-tools/typespec-providerhub/no-inline-model" "This operation signature is not used in Azure Resource Manager operations (yet)"
op LongRunningOperation<
  TParams extends TypeSpec.Reflection.Model,
  TResponse = AcceptedResponse,
  Traits extends TypeSpec.Reflection.Model = {},
  TErrorResponse = Azure.Core.Foundations.ErrorResponse
> is Operation<TParams, TResponse & Foundations.LongRunningStatusLocation, Traits, TErrorResponse>;

/**
 * Operation that returns the status of another operation.
 * @template TParams Object describing the request parameters of the operation.
 * @template TStatusResult The type of the operation status result.
 * @template TStatusError The type of the operation status error.
 * @template Traits Traits which apply to the operation.
 * @template TErrorResponse The type of the error response. If not provided, the default error response type will be used.
 */
op GetOperationStatus<
  TParams = {},
  TStatusResult = never,
  TStatusError = Error,
  Traits extends TypeSpec.Reflection.Model = {},
  TErrorResponse = Azure.Core.Foundations.ErrorResponse
> is Foundations.Operation<
  TParams & {
    @doc("The unique ID of the operation.")
    @path
    operationId: string;
  },
  OperationStatus<TStatusResult, TStatusError>,
  Traits,
  TErrorResponse
>;

// Fundamental Resource Operation Shapes

/**
 * The most basic operation that applies to a resource.
 * @template TResource The type of the resource.
 * @template TParams Object describing the request parameters of the operation.
 * @template TResponse Object describing the response properties of the operation.
 * @template Traits Traits which apply to the operation.
 * @template TErrorResponse The type of the error response. If not provided, the default error response type will be used.
 */
#suppress "@azure-tools/typespec-azure-resource-manager/no-response-body" "This operation must return a status monitor in its response."
@autoRoute
@Private.ensureResourceType(TResource)
op ResourceOperation<
  TResource extends TypeSpec.Reflection.Model,
  TParams extends TypeSpec.Reflection.Model,
  TResponse,  // No constraint here on purpose, some responses are unions
  Traits extends TypeSpec.Reflection.Model = {},
  TErrorResponse = Azure.Core.Foundations.ErrorResponse
> is Operation<Foundations.ItemKeysOf<TResource> & TParams, TResponse, Traits, TErrorResponse>;

/**
 * Operation that applies to a collection of resources.
 * @template TResource The type of the resource.
 * @template TParams Object describing the request parameters of the operation.
 * @template TResponse Object describing the response properties of the operation.
 * @template Traits Traits which apply to the operation.
 * @template TErrorResponse The type of the error response. If not provided, the default error response type will be used.
 */
#suppress "@azure-tools/typespec-azure-resource-manager/no-response-body" "This operation must return a status monitor in its response."
@autoRoute
@Private.ensureResourceType(TResource)
op ResourceCollectionOperation<
  TResource extends TypeSpec.Reflection.Model,
  TParams extends TypeSpec.Reflection.Model,
  TResponse extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {},
  TErrorResponse = Azure.Core.Foundations.ErrorResponse
> is Operation<
  Foundations.CollectionKeysOf<TResource> & TParams,
  TResponse,
  Traits,
  TErrorResponse
>;

/**
 * Operation that lists resources in a paginated way.
 * @template TResource The type of the resource.
 * @template TParams Object describing the request parameters of the operation.
 * @template TResponse Object describing the response properties of the operation.
 * @template Traits Traits which apply to the operation.
 * @template TErrorResponse The type of the error response. If not provided, the default error response type will be used.
 */
@listsResource(TResource)
@Private.ensureResourceType(TResource)
op ResourceList<
  TResource extends TypeSpec.Reflection.Model,
  TParams extends TypeSpec.Reflection.Model,
  TResponse extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {},
  TErrorResponse = Azure.Core.Foundations.ErrorResponse
> is ResourceCollectionOperation<TResource, TParams, TResponse, Traits, TErrorResponse>;

/**
 * Operation that lists resources in a non-paginated way.
 * @template TResource The type of the resource.
 * @template Traits Traits which apply to the operation.
 * @template TErrorResponse The type of the error response. If not provided, the default error response type will be used.
 */
#suppress "@azure-tools/typespec-providerhub/no-inline-model" "This operation signature is not used in Azure Resource Manager operations (yet)"
@autoRoute
op NonPagedResourceList<
  TResource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {},
  TErrorResponse = Azure.Core.Foundations.ErrorResponse
> is Foundations.ResourceList<
  TResource,
  TraitProperties<Traits, TraitLocation.Parameters, TraitContext.List>,
  Body<TResource[]> & TraitProperties<Traits, TraitLocation.Response, TraitContext.List>,
  Traits,
  TErrorResponse
>;

/**
 * Long-running operation that updates a resource.
 * @template TResource The type of the resource.
 * @template Traits Traits which apply to the operation.
 * @template TErrorResponse The type of the error response. If not provided, the default error response type will be used.
 */
@updatesResource(TResource)
op LongRunningResourceUpdate<
  TResource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {},
  TErrorResponse = Azure.Core.Foundations.ErrorResponse
> is Foundations.ResourceOperation<
  TResource,
  {
    @doc("This request has a JSON Merge Patch body.")
    @TypeSpec.Http.header("Content-Type")
    contentType: "application/merge-patch+json";

    ...Foundations.ResourceBody<TResource>;
    ...TraitProperties<Traits, TraitLocation.Parameters, TraitContext.Update>;
  },
  Foundations.ResourceOkResponse<TResource &
    TraitProperties<Traits, TraitLocation.Response, TraitContext.Update> &
    Foundations.LongRunningStatusLocation<TResource>>,
  Traits,
  TErrorResponse
>;
