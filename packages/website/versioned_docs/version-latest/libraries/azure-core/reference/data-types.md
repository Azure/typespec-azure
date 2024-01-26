---
title: "Data types"
toc_min_heading_level: 2
toc_max_heading_level: 3
---

# Data types

## Azure.Core

### `AadOauth2Auth` {#Azure.Core.AadOauth2Auth}

Azure Active Directory OAuth2 Flow

```typespec
model Azure.Core.AadOauth2Auth<Scopes, AuthUrl, TokenUrl>
```

#### Template Parameters

| Name     | Description                            |
| -------- | -------------------------------------- |
| Scopes   | A list of scopes the token applies to. |
| AuthUrl  | The authorization URL.                 |
| TokenUrl | The token URL.                         |

### `AadTokenAuthFlow` {#Azure.Core.AadTokenAuthFlow}

Azure Active Directory (AAD) Token Authentication Flow

```typespec
model Azure.Core.AadTokenAuthFlow<Scopes, AuthUrl, TokenUrl>
```

#### Template Parameters

| Name     | Description                            |
| -------- | -------------------------------------- |
| Scopes   | A list of scopes the token applies to. |
| AuthUrl  | The authorization URL.                 |
| TokenUrl | The token URL.                         |

### `AzureApiKeyAuthentication` {#Azure.Core.AzureApiKeyAuthentication}

Azure API Key Authentication using the "Ocp-Apim-Subscription-Key" hea

```typespec
model Azure.Core.AzureApiKeyAuthentication
```

### `ClientRequestIdHeader` {#Azure.Core.ClientRequestIdHeader}

Provides the 'x-ms-client-request-id' header to enable request correlation in requests and responses.

```typespec
model Azure.Core.ClientRequestIdHeader
```

### `ConditionalRequestHeaders` {#Azure.Core.ConditionalRequestHeaders}

Provides the 'If-\*' headers to enable conditional (cached) responses

```typespec
model Azure.Core.ConditionalRequestHeaders
```

### `EmbeddingVector` {#Azure.Core.EmbeddingVector}

A vector embedding frequently used in similarity search.

```typespec
model Azure.Core.EmbeddingVector<Element>
```

#### Template Parameters

| Name    | Description                               |
| ------- | ----------------------------------------- |
| Element | The element type of the embedding vector. |

### `EtagProperty` {#Azure.Core.EtagProperty}

Provides the 'ETag' field to enable conditional (cached) requests. This model can be spread
into responses and item models to convey the ETag when it cannot simply conveyed in a header.

```typespec
model Azure.Core.EtagProperty
```

### `EtagResponseEnvelope` {#Azure.Core.EtagResponseEnvelope}

Provides the 'ETag' header to enable conditional (cached) requests

```typespec
model Azure.Core.EtagResponseEnvelope
```

### `ExpandQueryParameter` {#Azure.Core.ExpandQueryParameter}

Provides the standard 'expand' query parameter for list operations.

```typespec
model Azure.Core.ExpandQueryParameter
```

### `FilterParameter` {#Azure.Core.FilterParameter}

Provides the standard 'filter' query parameter for list operations

```typespec
model Azure.Core.FilterParameter
```

### `FilterQueryParameter` {#Azure.Core.FilterQueryParameter}

Provides the standard 'filter' query parameter for list operations.

```typespec
model Azure.Core.FilterQueryParameter
```

### `MaxPageSizeQueryParameter` {#Azure.Core.MaxPageSizeQueryParameter}

Provides the standard 'maxpagesize' query parameter for list operations.

```typespec
model Azure.Core.MaxPageSizeQueryParameter
```

### `OrderByQueryParameter` {#Azure.Core.OrderByQueryParameter}

Provides the standard 'orderby' query parameter for list operations.

```typespec
model Azure.Core.OrderByQueryParameter
```

### `Page` {#Azure.Core.Page}

Describes a page of resource object.

```typespec
model Azure.Core.Page<Resource>
```

#### Template Parameters

| Name     | Description        |
| -------- | ------------------ |
| Resource | The resource type. |

### `PollingOptions` {#Azure.Core.PollingOptions}

Generic polling options for LRO operations.

```typespec
model Azure.Core.PollingOptions
```

### `RepeatabilityRequestHeaders` {#Azure.Core.RepeatabilityRequestHeaders}

Provides the 'Repeatability-\*' headers to enable repeatable requests.

```typespec
model Azure.Core.RepeatabilityRequestHeaders
```

### `RepeatabilityResponseHeaders` {#Azure.Core.RepeatabilityResponseHeaders}

Provides the 'Repeatability-\*' headers to enable repeatable requests.

```typespec
model Azure.Core.RepeatabilityResponseHeaders
```

### `RequestIdResponseHeader` {#Azure.Core.RequestIdResponseHeader}

Provides the 'x-ms-request-id' header to enable request correlation in responses.

```typespec
model Azure.Core.RequestIdResponseHeader
```

### `RequestParameter` {#Azure.Core.RequestParameter}

Defines a property as a request parameter.

```typespec
model Azure.Core.RequestParameter<Name>
```

#### Template Parameters

| Name | Description         |
| ---- | ------------------- |
| Name | The parameter name. |

### `ResourceOperationStatus` {#Azure.Core.ResourceOperationStatus}

```typespec
model Azure.Core.ResourceOperationStatus<Resource, StatusResult, StatusError>
```

#### Template Parameters

| Name         | Description                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------- |
| Resource     | The resource type.                                                                                |
| StatusResult | Model describing the status result object. If not specified, the default is the resource type.    |
| StatusError  | Model describing the status error object. If not specified, the default is the Foundations.Error. |

### `ResponseProperty` {#Azure.Core.ResponseProperty}

Defines a property as a response header.

```typespec
model Azure.Core.ResponseProperty<Name>
```

#### Template Parameters

| Name | Description      |
| ---- | ---------------- |
| Name | The header name. |

### `SelectQueryParameter` {#Azure.Core.SelectQueryParameter}

Provides the standard 'select' query parameter for list operations.

```typespec
model Azure.Core.SelectQueryParameter
```

### `SkipQueryParameter` {#Azure.Core.SkipQueryParameter}

Provides the standard 'skip' query parameter for list operations.

```typespec
model Azure.Core.SkipQueryParameter
```

### `StandardListQueryParameters` {#Azure.Core.StandardListQueryParameters}

Provides the most common query parameters for list operations.

```typespec
model Azure.Core.StandardListQueryParameters
```

### `StatusMonitorOptions` {#Azure.Core.StatusMonitorOptions}

Options for Lro status monitors.

```typespec
model Azure.Core.StatusMonitorOptions
```

### `StatusMonitorPollingOptions` {#Azure.Core.StatusMonitorPollingOptions}

Options for overriding a polling endpoint that uses a StatusMonitor

```typespec
model Azure.Core.StatusMonitorPollingOptions<PollingModel, FinalResult, FinalProperty>
```

#### Template Parameters

| Name          | Description                                                      |
| ------------- | ---------------------------------------------------------------- |
| PollingModel  | The model that is returned when polling should continue.         |
| FinalResult   | The model that is returned when polling terminates successfully. |
| FinalProperty | The property of the status monitor that contains results.        |

### `TopQueryParameter` {#Azure.Core.TopQueryParameter}

Provides the standard 'top' query parameter for list operations.

```typespec
model Azure.Core.TopQueryParameter
```

### `Versions` {#Azure.Core.Versions}

Supported versions of Azure.Core TypeSpec building blocks.

```typespec
enum Azure.Core.Versions
```

### `PollingOptionKind` {#Azure.Core.PollingOptionKind}

The available kinds of polling options

```typespec
union Azure.Core.PollingOptionKind
```

### `RepeatabilityResult` {#Azure.Core.RepeatabilityResult}

Repeatability Result header options

```typespec
union Azure.Core.RepeatabilityResult
```

### `eTag` {#Azure.Core.eTag}

The ETag (or entity tag) HTTP response header is an identifier for a specific version of a resource.
It lets caches be more efficient and save bandwidth, as a web server does not need to resend a full response if the content was not changed.

It is a string of ASCII characters placed between double quotes, like "675af34563dc-tr34".

```typespec
scalar Azure.Core.eTag
```

#### Examples

##### In `ETag` header

```
ETag: "675af34563dc-tr34"
```

### `ipV4Address` {#Azure.Core.ipV4Address}

Represent an IP V4 address serialized as a string.

It is formatted as four 8-bit fields separated by periods.

```typespec
scalar Azure.Core.ipV4Address
```

#### Examples

```
129.144.50.56
```

### `ipV6Address` {#Azure.Core.ipV6Address}

Represent an IP V6 address serialized as a string.

It is formatted as eight hex decimal values(16-bit) between 0 and FFFF separated by colon. (i.e. `y:y:y:y:y:y:y:y`)

```typespec
scalar Azure.Core.ipV6Address
```

#### Examples

```
2001:db8:3333:4444:CCCC:DDDD:EEEE:FFFF
```

### `uuid` {#Azure.Core.uuid}

Universally Unique Identifier

```typespec
scalar Azure.Core.uuid
```

#### Examples

```
123e4567-e89b-12d3-a456-426614174000
```

## Azure.Core.Foundations

### `ApiVersionParameter` {#Azure.Core.Foundations.ApiVersionParameter}

The ApiVersion query parameter.

```typespec
model Azure.Core.Foundations.ApiVersionParameter
```

### `CollectionKeysOf` {#Azure.Core.Foundations.CollectionKeysOf}

A model containing the collection keys of the provided resource's parent resource.

```typespec
model Azure.Core.Foundations.CollectionKeysOf<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

### `CreateableAndUpdateableProperties` {#Azure.Core.Foundations.CreateableAndUpdateableProperties}

Collection of properties from a resource that are visible to create or update scopes.

```typespec
model Azure.Core.Foundations.CreateableAndUpdateableProperties<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

### `CustomizationFields` {#Azure.Core.Foundations.CustomizationFields}

The expected shape of model types passed to the Custom parameter of operation signatures.

```typespec
model Azure.Core.Foundations.CustomizationFields
```

### `CustomPage` {#Azure.Core.Foundations.CustomPage}

A model describing a customized page of resources.

```typespec
model Azure.Core.Foundations.CustomPage<Resource, Traits>
```

#### Template Parameters

| Name     | Description                     |
| -------- | ------------------------------- |
| Resource | The type of the resource.       |
| Traits   | Traits which apply to the page. |

### `CustomParameters` {#Azure.Core.Foundations.CustomParameters}

A model describing a set of custom request parameters.

```typespec
model Azure.Core.Foundations.CustomParameters<Custom>
```

#### Template Parameters

| Name   | Description                                     |
| ------ | ----------------------------------------------- |
| Custom | An object describing custom request parameters. |

### `CustomResponseFields` {#Azure.Core.Foundations.CustomResponseFields}

A model describing a set of custom response properties.

```typespec
model Azure.Core.Foundations.CustomResponseFields<Custom>
```

#### Template Parameters

| Name   | Description                                      |
| ------ | ------------------------------------------------ |
| Custom | An object describing custom response properties. |

### `Error` {#Azure.Core.Foundations.Error}

The error object.

```typespec
model Azure.Core.Foundations.Error
```

### `ErrorResponse` {#Azure.Core.Foundations.ErrorResponse}

A response containing error details.

```typespec
model Azure.Core.Foundations.ErrorResponse
```

### `ErrorResponseBase` {#Azure.Core.Foundations.ErrorResponseBase}

A response containing error details.

```typespec
model Azure.Core.Foundations.ErrorResponseBase<Error>
```

#### Template Parameters

| Name  | Description                   |
| ----- | ----------------------------- |
| Error | The type of the error object. |

### `InnerError` {#Azure.Core.Foundations.InnerError}

An object containing more specific information about the error. As per Microsoft One API guidelines - https://github.com/Microsoft/api-guidelines/blob/vNext/Guidelines.md#7102-error-condition-responses.

```typespec
model Azure.Core.Foundations.InnerError
```

### `ItemKeysOf` {#Azure.Core.Foundations.ItemKeysOf}

A model containing the keys of the provided resource.

```typespec
model Azure.Core.Foundations.ItemKeysOf<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

### `LocationOfCreatedResourceResponse` {#Azure.Core.Foundations.LocationOfCreatedResourceResponse}

Response describing the location of a created resource.

```typespec
model Azure.Core.Foundations.LocationOfCreatedResourceResponse<Resource>
```

#### Template Parameters

| Name     | Description |
| -------- | ----------- |
| Resource |             |

### `LocationOfCreatedResourceWithServiceProvidedNameResponse` {#Azure.Core.Foundations.LocationOfCreatedResourceWithServiceProvidedNameResponse}

Response describing the location of a resource created with a service-provided name.

```typespec
model Azure.Core.Foundations.LocationOfCreatedResourceWithServiceProvidedNameResponse<Resource>
```

#### Template Parameters

| Name     | Description |
| -------- | ----------- |
| Resource |             |

### `LongRunningStatusLocation` {#Azure.Core.Foundations.LongRunningStatusLocation}

Metadata for long running operation status monitor locations.

```typespec
model Azure.Core.Foundations.LongRunningStatusLocation<StatusResult>
```

#### Template Parameters

| Name         | Description                              |
| ------------ | ---------------------------------------- |
| StatusResult | The type of the operation status result. |

### `OperationStatus` {#Azure.Core.Foundations.OperationStatus}

Provides status details for long running operations.

```typespec
model Azure.Core.Foundations.OperationStatus<StatusResult, StatusError>
```

#### Template Parameters

| Name         | Description                                                                         |
| ------------ | ----------------------------------------------------------------------------------- |
| StatusResult | The type of the operation status result.                                            |
| StatusError  | The type of the operation status error. If not provided, the default error is used. |

### `ResourceBody` {#Azure.Core.Foundations.ResourceBody}

Conveys the resource instance to an operation as a request body.

```typespec
model Azure.Core.Foundations.ResourceBody<Resource>
```

#### Template Parameters

| Name     | Description                        |
| -------- | ---------------------------------- |
| Resource | The type of the resource instance. |

### `ResourceCreateOrReplaceModel` {#Azure.Core.Foundations.ResourceCreateOrReplaceModel}

Version of a model for a create or replace operation which only includes updateable properties.

```typespec
model Azure.Core.Foundations.ResourceCreateOrReplaceModel<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

### `ResourceCreateOrUpdateModel` {#Azure.Core.Foundations.ResourceCreateOrUpdateModel}

Version of a model for a create or update operation which only includes updateable properties.

```typespec
model Azure.Core.Foundations.ResourceCreateOrUpdateModel<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

### `ResourceUpdateModel` {#Azure.Core.Foundations.ResourceUpdateModel}

Version of a model for an update operation which only includes updateable properties.

```typespec
model Azure.Core.Foundations.ResourceUpdateModel<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

### `RetryAfterHeader` {#Azure.Core.Foundations.RetryAfterHeader}

The retry-after envelope.

```typespec
model Azure.Core.Foundations.RetryAfterHeader
```

### `OperationState` {#Azure.Core.Foundations.OperationState}

Enum describing allowed operation states.

```typespec
enum Azure.Core.Foundations.OperationState
```

## Azure.Core.Traits

### `ListQueryParametersTrait` {#Azure.Core.Traits.ListQueryParametersTrait}

Declares a trait that is applied as a query parameter for list operations.

```typespec
model Azure.Core.Traits.ListQueryParametersTrait<Parameters>
```

#### Template Parameters

| Name       | Description                             |
| ---------- | --------------------------------------- |
| Parameters | Object describing the query parameters. |

### `NoClientRequestId` {#Azure.Core.Traits.NoClientRequestId}

Indicates that the service or operation does not support clientRequestId headers.

```typespec
model Azure.Core.Traits.NoClientRequestId
```

### `NoConditionalRequests` {#Azure.Core.Traits.NoConditionalRequests}

Indicates that the service or operation does not support conditional requests.

```typespec
model Azure.Core.Traits.NoConditionalRequests
```

### `NoRepeatableRequests` {#Azure.Core.Traits.NoRepeatableRequests}

Indicates that the service or operation does not support repeatable requests.

```typespec
model Azure.Core.Traits.NoRepeatableRequests
```

### `QueryParametersTrait` {#Azure.Core.Traits.QueryParametersTrait}

Declares a trait that is applied as a query parameter.

```typespec
model Azure.Core.Traits.QueryParametersTrait<Parameters, Contexts>
```

#### Template Parameters

| Name       | Description                                    |
| ---------- | ---------------------------------------------- |
| Parameters | The name of the query parameter.               |
| Contexts   | The contexts in which the trait is applicable. |

### `RequestHeadersTrait` {#Azure.Core.Traits.RequestHeadersTrait}

Declares a trait that is applied as a request header parameter.

```typespec
model Azure.Core.Traits.RequestHeadersTrait<Headers, Contexts>
```

#### Template Parameters

| Name     | Description                                      |
| -------- | ------------------------------------------------ |
| Headers  | Object describing the request header parameters. |
| Contexts | The contexts in which the trait is applicable.   |

### `ResponseHeadersTrait` {#Azure.Core.Traits.ResponseHeadersTrait}

Declares a trait that is applied as a response header parameter.

```typespec
model Azure.Core.Traits.ResponseHeadersTrait<Headers, Contexts>
```

#### Template Parameters

| Name     | Description                                       |
| -------- | ------------------------------------------------- |
| Headers  | Object describing the response header parameters. |
| Contexts | The contexts in which the trait is applicable.    |

### `SupportsClientRequestId` {#Azure.Core.Traits.SupportsClientRequestId}

Provides clientRequestId headers for requests and responses.

```typespec
model Azure.Core.Traits.SupportsClientRequestId<VersionAdded>
```

#### Template Parameters

| Name         | Description                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| VersionAdded | The version when the trait was added to the specification.<br />Leave this empty if the trait is always supported. |

### `SupportsConditionalRequests` {#Azure.Core.Traits.SupportsConditionalRequests}

Provides conditional request headers for requests and ETag headers for responses.

```typespec
model Azure.Core.Traits.SupportsConditionalRequests<VersionAdded>
```

#### Template Parameters

| Name         | Description                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| VersionAdded | The version when the trait was added to the specification.<br />Leave this empty if the trait is always supported. |

### `SupportsRepeatableRequests` {#Azure.Core.Traits.SupportsRepeatableRequests}

Provides repeatable request headers for requests and responses.

```typespec
model Azure.Core.Traits.SupportsRepeatableRequests<VersionAdded>
```

#### Template Parameters

| Name         | Description                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| VersionAdded | The version when the trait was added to the specification.<br />Leave this empty if the trait is always supported. |

### `TraitOverride` {#Azure.Core.Traits.TraitOverride}

Used to override a trait.

```typespec
model Azure.Core.Traits.TraitOverride<Trait>
```

#### Template Parameters

| Name  | Description            |
| ----- | ---------------------- |
| Trait | The trait to override. |

### `VersionParameterTrait` {#Azure.Core.Traits.VersionParameterTrait}

Declares a version parameter trait.

```typespec
model Azure.Core.Traits.VersionParameterTrait<VersionParameter>
```

#### Template Parameters

| Name             | Description                        |
| ---------------- | ---------------------------------- |
| VersionParameter | The type of the version parameter. |

### `TraitContext` {#Azure.Core.Traits.TraitContext}

Enumerates the standard trait contexts for Azure.Core operations.

```typespec
enum Azure.Core.Traits.TraitContext
```

### `TraitLocation` {#Azure.Core.Traits.TraitLocation}

Enumerates the standard trait locations for Azure.Core operations.

```typespec
enum Azure.Core.Traits.TraitLocation
```
