---
title: "Data types"
---

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

#### Properties

| Name          | Type                                                 | Description                                                                    |
| ------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| type          | `TypeSpec.Http.AuthType.oauth2`                      | OAuth2 authentication                                                          |
| flows         | `[Core.AadTokenAuthFlow<Scopes, AuthUrl, TokenUrl>]` | Supported OAuth2 flows                                                         |
| defaultScopes | `[]`                                                 | Oauth2 scopes of every flow. Overridden by scope definitions in specific flows |

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

#### Properties

| Name             | Type                                             | Description |
| ---------------- | ------------------------------------------------ | ----------- |
| type             | `TypeSpec.Http.OAuth2FlowType.authorizationCode` |             |
| authorizationUrl | `AuthUrl`                                        |             |
| tokenUrl         | `TokenUrl`                                       |             |
| scopes           | `Scopes`                                         |             |

### `ArmResourceIdentifierAllowedResource` {#Azure.Core.ArmResourceIdentifierAllowedResource}

```typespec
model Azure.Core.ArmResourceIdentifierAllowedResource
```

#### Properties

| Name    | Type                                             | Description                                                                                                                                                                          |
| ------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| type    | [`armResourceType`](#Azure.Core.armResourceType) | The type of resource that is being referred to. For example Microsoft.Network/virtualNetworks or Microsoft.Network/virtualNetworks/subnets. See Example Types for more examples.     |
| scopes? | `Core.ArmResourceDeploymentScope[]`              | An array of scopes. If not specified, the default scope is ["ResourceGroup"].<br />See [Allowed Scopes](https://github.com/Azure/autorest/tree/main/docs/extensions#allowed-scopes). |

### `AzureApiKeyAuthentication` {#Azure.Core.AzureApiKeyAuthentication}

Azure API Key Authentication using the "Ocp-Apim-Subscription-Key" hea

```typespec
model Azure.Core.AzureApiKeyAuthentication
```

#### Properties

| Name | Type                                  | Description             |
| ---- | ------------------------------------- | ----------------------- |
| type | `TypeSpec.Http.AuthType.apiKey`       | API key authentication  |
| in   | `TypeSpec.Http.ApiKeyLocation.header` | location of the API key |
| name | `"Ocp-Apim-Subscription-Key"`         | name of the API key     |

### `ClientRequestIdHeader` {#Azure.Core.ClientRequestIdHeader}

Provides the 'x-ms-client-request-id' header to enable request correlation in requests and responses.

```typespec
model Azure.Core.ClientRequestIdHeader
```

#### Properties

| Name             | Type                       | Description                                                                     |
| ---------------- | -------------------------- | ------------------------------------------------------------------------------- |
| clientRequestId? | [`uuid`](#Azure.Core.uuid) | An opaque, globally-unique, client-generated string identifier for the request. |

### `ConditionalRequestHeaders` {#Azure.Core.ConditionalRequestHeaders}

Provides the 'If-\*' headers to enable conditional (cached) responses

```typespec
model Azure.Core.ConditionalRequestHeaders
```

#### Properties

| Name               | Type          | Description                                                                     |
| ------------------ | ------------- | ------------------------------------------------------------------------------- |
| ifMatch?           | `string`      | The request should only proceed if an entity matches this string.               |
| ifNoneMatch?       | `string`      | The request should only proceed if no entity matches this string.               |
| ifUnmodifiedSince? | `utcDateTime` | The request should only proceed if the entity was not modified after this time. |
| ifModifiedSince?   | `utcDateTime` | The request should only proceed if the entity was modified after this time.     |

### `EmbeddingVector` {#Azure.Core.EmbeddingVector}

A vector embedding frequently used in similarity search.

```typespec
model Azure.Core.EmbeddingVector<Element>
```

#### Template Parameters

| Name    | Description                               |
| ------- | ----------------------------------------- |
| Element | The element type of the embedding vector. |

#### Properties

None

### `EtagProperty` {#Azure.Core.EtagProperty}

Provides the 'ETag' field to enable conditional (cached) requests. This model can be spread
into responses and item models to convey the ETag when it cannot simply conveyed in a header.

```typespec
model Azure.Core.EtagProperty
```

#### Properties

| Name | Type                       | Description                       |
| ---- | -------------------------- | --------------------------------- |
| etag | [`eTag`](#Azure.Core.eTag) | The entity tag for this resource. |

### `EtagResponseEnvelope` {#Azure.Core.EtagResponseEnvelope}

Provides the 'ETag' header to enable conditional (cached) requests

```typespec
model Azure.Core.EtagResponseEnvelope
```

#### Properties

| Name        | Type     | Description                      |
| ----------- | -------- | -------------------------------- |
| etagHeader? | `string` | The entity tag for the response. |

### `ExpandQueryParameter` {#Azure.Core.ExpandQueryParameter}

Provides the standard 'expand' query parameter for list operations.

```typespec
model Azure.Core.ExpandQueryParameter
```

#### Properties

| Name    | Type       | Description                                       |
| ------- | ---------- | ------------------------------------------------- |
| expand? | `string[]` | Expand the indicated resources into the response. |

### `FilterParameter` {#Azure.Core.FilterParameter}

Provides the standard 'filter' query parameter for list operations

```typespec
model Azure.Core.FilterParameter
```

#### Properties

| Name    | Type     | Description                                  |
| ------- | -------- | -------------------------------------------- |
| filter? | `string` | The maximum number of result items per page. |

### `FilterQueryParameter` {#Azure.Core.FilterQueryParameter}

Provides the standard 'filter' query parameter for list operations.

```typespec
model Azure.Core.FilterQueryParameter
```

#### Properties

| Name    | Type     | Description                                        |
| ------- | -------- | -------------------------------------------------- |
| filter? | `string` | Filter the result list using the given expression. |

### `MaxPageSizeQueryParameter` {#Azure.Core.MaxPageSizeQueryParameter}

Provides the standard 'maxpagesize' query parameter for list operations.

```typespec
model Azure.Core.MaxPageSizeQueryParameter
```

#### Properties

| Name         | Type    | Description                                  |
| ------------ | ------- | -------------------------------------------- |
| maxpagesize? | `int32` | The maximum number of result items per page. |

### `OrderByQueryParameter` {#Azure.Core.OrderByQueryParameter}

Provides the standard 'orderby' query parameter for list operations.

```typespec
model Azure.Core.OrderByQueryParameter
```

#### Properties

| Name     | Type       | Description                                             |
| -------- | ---------- | ------------------------------------------------------- |
| orderby? | `string[]` | Expressions that specify the order of returned results. |

### `Page` {#Azure.Core.Page}

Describes a page of resource object.

```typespec
model Azure.Core.Page<Resource>
```

#### Template Parameters

| Name     | Description        |
| -------- | ------------------ |
| Resource | The resource type. |

#### Properties

| Name      | Type                             | Description |
| --------- | -------------------------------- | ----------- |
| value     | `Array<Element>`                 |             |
| nextLink? | `TypeSpec.Rest.ResourceLocation` |             |

### `PollingOptions` {#Azure.Core.PollingOptions}

Generic polling options for LRO operations.

```typespec
model Azure.Core.PollingOptions
```

#### Properties

| Name          | Type                                                                | Description                                                     |
| ------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- |
| kind          | [`PollingOptionKind`](./data-types.md#Azure.Core.PollingOptionKind) | The kind of polling options                                     |
| pollingModel? | `Model \| void`                                                     | The model that is returned when polling should continue.        |
| finalResult?  | `Model \| void`                                                     | The type that is returned when polling terminates successfully. |

### `RepeatabilityRequestHeaders` {#Azure.Core.RepeatabilityRequestHeaders}

Provides the 'Repeatability-\*' headers to enable repeatable requests.

```typespec
model Azure.Core.RepeatabilityRequestHeaders
```

#### Properties

| Name                    | Type          | Description                                                                     |
| ----------------------- | ------------- | ------------------------------------------------------------------------------- |
| repeatabilityRequestId? | `string`      | An opaque, globally-unique, client-generated string identifier for the request. |
| repeatabilityFirstSent? | `utcDateTime` | Specifies the date and time at which the request was first created.             |

### `RepeatabilityResponseHeaders` {#Azure.Core.RepeatabilityResponseHeaders}

Provides the 'Repeatability-\*' headers to enable repeatable requests.

```typespec
model Azure.Core.RepeatabilityResponseHeaders
```

#### Properties

| Name                 | Type                                                                    | Description                                                        |
| -------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| repeatabilityResult? | [`RepeatabilityResult`](./data-types.md#Azure.Core.RepeatabilityResult) | Indicates whether the repeatable request was accepted or rejected. |

### `RequestIdResponseHeader` {#Azure.Core.RequestIdResponseHeader}

Provides the 'x-ms-request-id' header to enable request correlation in responses.

```typespec
model Azure.Core.RequestIdResponseHeader
```

#### Properties

| Name       | Type                       | Description                                                                     |
| ---------- | -------------------------- | ------------------------------------------------------------------------------- |
| requestId? | [`uuid`](#Azure.Core.uuid) | An opaque, globally-unique, server-generated string identifier for the request. |

### `RequestParameter` {#Azure.Core.RequestParameter}

Defines a property as a request parameter.

```typespec
model Azure.Core.RequestParameter<Name>
```

#### Template Parameters

| Name | Description         |
| ---- | ------------------- |
| Name | The parameter name. |

#### Properties

None

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

#### Properties

| Name    | Type                                                                      | Description |
| ------- | ------------------------------------------------------------------------- | ----------- |
| id      | `string`                                                                  |             |
| status  | [`OperationState`](./data-types.md#Azure.Core.Foundations.OperationState) |             |
| error?  | `StatusError`                                                             |             |
| result? | `StatusResult`                                                            |             |

### `ResponseProperty` {#Azure.Core.ResponseProperty}

Defines a property as a response header.

```typespec
model Azure.Core.ResponseProperty<Name>
```

#### Template Parameters

| Name | Description      |
| ---- | ---------------- |
| Name | The header name. |

#### Properties

None

### `SelectQueryParameter` {#Azure.Core.SelectQueryParameter}

Provides the standard 'select' query parameter for list operations.

```typespec
model Azure.Core.SelectQueryParameter
```

#### Properties

| Name    | Type       | Description                                                 |
| ------- | ---------- | ----------------------------------------------------------- |
| select? | `string[]` | Select the specified fields to be included in the response. |

### `SkipQueryParameter` {#Azure.Core.SkipQueryParameter}

Provides the standard 'skip' query parameter for list operations.

```typespec
model Azure.Core.SkipQueryParameter
```

#### Properties

| Name  | Type    | Description                         |
| ----- | ------- | ----------------------------------- |
| skip? | `int32` | The number of result items to skip. |

### `StandardListQueryParameters` {#Azure.Core.StandardListQueryParameters}

Provides the most common query parameters for list operations.

```typespec
model Azure.Core.StandardListQueryParameters
```

#### Properties

| Name         | Type    | Description                                  |
| ------------ | ------- | -------------------------------------------- |
| top?         | `int32` | The number of result items to return.        |
| skip?        | `int32` | The number of result items to skip.          |
| maxpagesize? | `int32` | The maximum number of result items per page. |

### `StatusMonitorOptions` {#Azure.Core.StatusMonitorOptions}

Options for Lro status monitors.

```typespec
model Azure.Core.StatusMonitorOptions
```

#### Properties

| Name           | Type                      | Description                                                                             |
| -------------- | ------------------------- | --------------------------------------------------------------------------------------- |
| kind           | `"statusMonitor"`         | The kind of polling options                                                             |
| finalProperty? | `ModelProperty \| string` | A reference to or name of the property of the status monitor that contains the response |

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

#### Properties

| Name          | Type              | Description                                                     |
| ------------- | ----------------- | --------------------------------------------------------------- |
| kind          | `"statusMonitor"` | The kind of polling options                                     |
| pollingModel  | `PollingModel`    | The model that is returned when polling should continue         |
| finalResult   | `FinalResult`     | The model that is returned when polling terminates successfully |
| finalProperty | `FinalProperty`   | The property of the status monitor that contains results        |

### `TopQueryParameter` {#Azure.Core.TopQueryParameter}

Provides the standard 'top' query parameter for list operations.

```typespec
model Azure.Core.TopQueryParameter
```

#### Properties

| Name | Type    | Description                           |
| ---- | ------- | ------------------------------------- |
| top? | `int32` | The number of result items to return. |

### `Versions` {#Azure.Core.Versions}

Supported versions of Azure.Core TypeSpec building blocks.

```typespec
enum Azure.Core.Versions
```

| Name           | Value             | Description           |
| -------------- | ----------------- | --------------------- |
| v1_0_Preview_1 | `"1.0-preview.1"` | Version 1.0-preview.1 |
| v1_0_Preview_2 | `"1.0-preview.2"` | Version 1.0-preview.2 |

### `ArmResourceDeploymentScope` {#Azure.Core.ArmResourceDeploymentScope}

```typespec
union Azure.Core.ArmResourceDeploymentScope
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

### `armResourceIdentifier` {#Azure.Core.armResourceIdentifier}

A type definition that refers the id to an Azure Resource Manager resource.

```typespec
scalar Azure.Core.armResourceIdentifier
```

#### Examples

```tsp
model MyModel {
  otherArmId: armResourceIdentifier;
  networkId: armResourceIdentifier<[
    {
      type: "Microsoft.Network/vnet";
    }
  ]>;
  vmIds: armResourceIdentifier<[
    {
      type: "Microsoft.Compute/vm";
      scopes: ["*"];
    }
  ]>;
  scoped: armResourceIdentifier<[
    {
      type: "Microsoft.Compute/vm";
      scopes: ["tenant", "resourceGroup"];
    }
  ]>;
}
```

### `armResourceType` {#Azure.Core.armResourceType}

Represents an Azure Resource Type.

```typespec
scalar Azure.Core.armResourceType
```

#### Examples

```
Microsoft.Network/virtualNetworks/subnets
```

### `azureLocation` {#Azure.Core.azureLocation}

Represents an Azure geography region where supported resource providers live.

```typespec
scalar Azure.Core.azureLocation
```

#### Examples

```
WestUS
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

#### Properties

| Name       | Type     | Description                                |
| ---------- | -------- | ------------------------------------------ |
| apiVersion | `string` | The API version to use for this operation. |

### `CollectionKeysOf` {#Azure.Core.Foundations.CollectionKeysOf}

A model containing the collection keys of the provided resource's parent resource.

```typespec
model Azure.Core.Foundations.CollectionKeysOf<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

#### Properties

None

### `CreateableAndUpdateableProperties` {#Azure.Core.Foundations.CreateableAndUpdateableProperties}

Collection of properties from a resource that are visible to create or update scopes.

```typespec
model Azure.Core.Foundations.CreateableAndUpdateableProperties<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

#### Properties

None

### `CustomizationFields` {#Azure.Core.Foundations.CustomizationFields}

The expected shape of model types passed to the Custom parameter of operation signatures.

```typespec
model Azure.Core.Foundations.CustomizationFields
```

#### Properties

| Name        | Type | Description                                                                    |
| ----------- | ---- | ------------------------------------------------------------------------------ |
| parameters? | `{}` | An object containing custom parameters that will be included in the operation. |
| response?   | `{}` | An object containing custom properties that will be included in the response.  |

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

#### Properties

| Name      | Type                             | Description |
| --------- | -------------------------------- | ----------- |
| value     | `Array<Element>`                 |             |
| nextLink? | `TypeSpec.Rest.ResourceLocation` |             |

### `CustomParameters` {#Azure.Core.Foundations.CustomParameters}

A model describing a set of custom request parameters.

```typespec
model Azure.Core.Foundations.CustomParameters<Custom>
```

#### Template Parameters

| Name   | Description                                     |
| ------ | ----------------------------------------------- |
| Custom | An object describing custom request parameters. |

#### Properties

None

### `CustomResponseFields` {#Azure.Core.Foundations.CustomResponseFields}

A model describing a set of custom response properties.

```typespec
model Azure.Core.Foundations.CustomResponseFields<Custom>
```

#### Template Parameters

| Name   | Description                                      |
| ------ | ------------------------------------------------ |
| Custom | An object describing custom response properties. |

#### Properties

None

### `Error` {#Azure.Core.Foundations.Error}

The error object.

```typespec
model Azure.Core.Foundations.Error
```

#### Properties

| Name        | Type                                                              | Description                                                                             |
| ----------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| code        | `string`                                                          | One of a server-defined set of error codes.                                             |
| message     | `string`                                                          | A human-readable representation of the error.                                           |
| target?     | `string`                                                          | The target of the error.                                                                |
| details?    | `Core.Foundations.Error[]`                                        | An array of details about specific errors that led to this reported error.              |
| innererror? | [`InnerError`](./data-types.md#Azure.Core.Foundations.InnerError) | An object containing more specific information than the current object about the error. |

### `ErrorResponse` {#Azure.Core.Foundations.ErrorResponse}

A response containing error details.

```typespec
model Azure.Core.Foundations.ErrorResponse
```

#### Properties

| Name       | Type                                                    | Description                                   |
| ---------- | ------------------------------------------------------- | --------------------------------------------- |
| error      | [`Error`](./data-types.md#Azure.Core.Foundations.Error) | The error object.                             |
| errorCode? | `string`                                                | String error code indicating what went wrong. |

### `ErrorResponseBase` {#Azure.Core.Foundations.ErrorResponseBase}

A response containing error details.

```typespec
model Azure.Core.Foundations.ErrorResponseBase<Error>
```

#### Template Parameters

| Name  | Description                   |
| ----- | ----------------------------- |
| Error | The type of the error object. |

#### Properties

| Name       | Type     | Description |
| ---------- | -------- | ----------- |
| error      | `Error`  |             |
| errorCode? | `string` |             |

### `InnerError` {#Azure.Core.Foundations.InnerError}

An object containing more specific information about the error. As per Microsoft One API guidelines - https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#handling-errors.

```typespec
model Azure.Core.Foundations.InnerError
```

#### Properties

| Name        | Type                                                              | Description                                 |
| ----------- | ----------------------------------------------------------------- | ------------------------------------------- |
| code?       | `string`                                                          | One of a server-defined set of error codes. |
| innererror? | [`InnerError`](./data-types.md#Azure.Core.Foundations.InnerError) | Inner error.                                |

### `ItemKeysOf` {#Azure.Core.Foundations.ItemKeysOf}

A model containing the keys of the provided resource.

```typespec
model Azure.Core.Foundations.ItemKeysOf<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

#### Properties

None

### `LocationOfCreatedResourceResponse` {#Azure.Core.Foundations.LocationOfCreatedResourceResponse}

Response describing the location of a created resource.

```typespec
model Azure.Core.Foundations.LocationOfCreatedResourceResponse<Resource>
```

#### Template Parameters

| Name     | Description |
| -------- | ----------- |
| Resource |             |

#### Properties

| Name       | Type                             | Description      |
| ---------- | -------------------------------- | ---------------- |
| statusCode | `201`                            | The status code. |
| location   | `TypeSpec.Rest.ResourceLocation` |                  |

### `LocationOfCreatedResourceWithServiceProvidedNameResponse` {#Azure.Core.Foundations.LocationOfCreatedResourceWithServiceProvidedNameResponse}

Response describing the location of a resource created with a service-provided name.

```typespec
model Azure.Core.Foundations.LocationOfCreatedResourceWithServiceProvidedNameResponse<Resource>
```

#### Template Parameters

| Name     | Description |
| -------- | ----------- |
| Resource |             |

#### Properties

| Name       | Type                             | Description      |
| ---------- | -------------------------------- | ---------------- |
| statusCode | `202`                            | The status code. |
| location   | `TypeSpec.Rest.ResourceLocation` |                  |

### `LongRunningStatusLocation` {#Azure.Core.Foundations.LongRunningStatusLocation}

Metadata for long running operation status monitor locations.

```typespec
model Azure.Core.Foundations.LongRunningStatusLocation<StatusResult>
```

#### Template Parameters

| Name         | Description                              |
| ------------ | ---------------------------------------- |
| StatusResult | The type of the operation status result. |

#### Properties

| Name              | Type                             | Description |
| ----------------- | -------------------------------- | ----------- |
| operationLocation | `TypeSpec.Rest.ResourceLocation` |             |

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

#### Properties

| Name    | Type                                                                      | Description |
| ------- | ------------------------------------------------------------------------- | ----------- |
| id      | `string`                                                                  |             |
| status  | [`OperationState`](./data-types.md#Azure.Core.Foundations.OperationState) |             |
| error?  | `StatusError`                                                             |             |
| result? | `StatusResult`                                                            |             |

### `ResourceBody` {#Azure.Core.Foundations.ResourceBody}

Conveys the resource instance to an operation as a request body.

```typespec
model Azure.Core.Foundations.ResourceBody<Resource>
```

#### Template Parameters

| Name     | Description                        |
| -------- | ---------------------------------- |
| Resource | The type of the resource instance. |

#### Properties

| Name     | Type       | Description |
| -------- | ---------- | ----------- |
| resource | `Resource` |             |

### `ResourceCreateOrReplaceModel` {#Azure.Core.Foundations.ResourceCreateOrReplaceModel}

Version of a model for a create or replace operation which only includes updateable properties.

```typespec
model Azure.Core.Foundations.ResourceCreateOrReplaceModel<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

#### Properties

None

### `ResourceCreateOrUpdateModel` {#Azure.Core.Foundations.ResourceCreateOrUpdateModel}

Version of a model for a create or update operation which only includes updateable properties.

```typespec
model Azure.Core.Foundations.ResourceCreateOrUpdateModel<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

#### Properties

None

### `ResourceUpdateModel` {#Azure.Core.Foundations.ResourceUpdateModel}

Version of a model for an update operation which only includes updateable properties.

```typespec
model Azure.Core.Foundations.ResourceUpdateModel<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

#### Properties

None

### `RetryAfterHeader` {#Azure.Core.Foundations.RetryAfterHeader}

The retry-after envelope.

```typespec
model Azure.Core.Foundations.RetryAfterHeader
```

#### Properties

| Name        | Type    | Description                                                                                              |
| ----------- | ------- | -------------------------------------------------------------------------------------------------------- |
| retryAfter? | `int32` | The Retry-After header can indicate how long the client should wait before polling the operation status. |

### `OperationState` {#Azure.Core.Foundations.OperationState}

Enum describing allowed operation states.

```typespec
union Azure.Core.Foundations.OperationState
```

## Azure.Core.Legacy

### `parameterizedNextLink` {#Azure.Core.Legacy.parameterizedNextLink}

A scalar type representing a next link that requires formatting with parameters to be used.

```typespec
scalar Azure.Core.Legacy.parameterizedNextLink
```

#### Examples

```typespec
model ListCertificateOptions {
  includePending?: string;
}
model Certificate {
  name: string;
}
model Page {
  @pageItems items: Certificate[];
  @nextLink nextLink: Azure.Core.Legacy.parameterizedNextLink<[
    ListCertificateOptions.includePending
  ]>;
}
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

#### Properties

| Name                   | Type         | Description |
| ---------------------- | ------------ | ----------- |
| queryParams            | `{...}`      |             |
| queryParams.parameters | `Parameters` |             |

### `NoClientRequestId` {#Azure.Core.Traits.NoClientRequestId}

Indicates that the service or operation does not support clientRequestId headers.

```typespec
model Azure.Core.Traits.NoClientRequestId
```

#### Properties

| Name            | Type | Description |
| --------------- | ---- | ----------- |
| clientRequestId | `{}` |             |

### `NoConditionalRequests` {#Azure.Core.Traits.NoConditionalRequests}

Indicates that the service or operation does not support conditional requests.

```typespec
model Azure.Core.Traits.NoConditionalRequests
```

#### Properties

| Name                | Type | Description |
| ------------------- | ---- | ----------- |
| conditionalRequests | `{}` |             |

### `NoRepeatableRequests` {#Azure.Core.Traits.NoRepeatableRequests}

Indicates that the service or operation does not support repeatable requests.

```typespec
model Azure.Core.Traits.NoRepeatableRequests
```

#### Properties

| Name               | Type | Description |
| ------------------ | ---- | ----------- |
| repeatableRequests | `{}` |             |

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

#### Properties

| Name                   | Type         | Description |
| ---------------------- | ------------ | ----------- |
| queryParams            | `{...}`      |             |
| queryParams.parameters | `Parameters` |             |

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

#### Properties

| Name                      | Type      | Description |
| ------------------------- | --------- | ----------- |
| requestHeaders            | `{...}`   |             |
| requestHeaders.parameters | `Headers` |             |

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

#### Properties

| Name                       | Type      | Description |
| -------------------------- | --------- | ----------- |
| responseHeaders            | `{...}`   |             |
| responseHeaders.parameters | `Headers` |             |

### `SupportsClientRequestId` {#Azure.Core.Traits.SupportsClientRequestId}

Provides clientRequestId headers for requests and responses.

```typespec
model Azure.Core.Traits.SupportsClientRequestId<VersionAdded>
```

#### Template Parameters

| Name         | Description                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| VersionAdded | The version when the trait was added to the specification.<br />Leave this empty if the trait is always supported. |

#### Properties

| Name                       | Type                                                                        | Description |
| -------------------------- | --------------------------------------------------------------------------- | ----------- |
| clientRequestId            | `{...}`                                                                     |             |
| clientRequestId.parameters | [`ClientRequestIdHeader`](./data-types.md#Azure.Core.ClientRequestIdHeader) |             |
| clientRequestId.response   | [`ClientRequestIdHeader`](./data-types.md#Azure.Core.ClientRequestIdHeader) |             |

### `SupportsConditionalRequests` {#Azure.Core.Traits.SupportsConditionalRequests}

Provides conditional request headers for requests and ETag headers for responses.

```typespec
model Azure.Core.Traits.SupportsConditionalRequests<VersionAdded>
```

#### Template Parameters

| Name         | Description                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| VersionAdded | The version when the trait was added to the specification.<br />Leave this empty if the trait is always supported. |

#### Properties

| Name                           | Type                                                                                | Description |
| ------------------------------ | ----------------------------------------------------------------------------------- | ----------- |
| conditionalRequests            | `{...}`                                                                             |             |
| conditionalRequests.parameters | [`ConditionalRequestHeaders`](./data-types.md#Azure.Core.ConditionalRequestHeaders) |             |
| conditionalRequests.response   | [`EtagResponseEnvelope`](./data-types.md#Azure.Core.EtagResponseEnvelope)           |             |

### `SupportsRepeatableRequests` {#Azure.Core.Traits.SupportsRepeatableRequests}

Provides repeatable request headers for requests and responses.

```typespec
model Azure.Core.Traits.SupportsRepeatableRequests<VersionAdded>
```

#### Template Parameters

| Name         | Description                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| VersionAdded | The version when the trait was added to the specification.<br />Leave this empty if the trait is always supported. |

#### Properties

| Name                          | Type                                                                                      | Description |
| ----------------------------- | ----------------------------------------------------------------------------------------- | ----------- |
| repeatableRequests            | `{...}`                                                                                   |             |
| repeatableRequests.parameters | [`RepeatabilityRequestHeaders`](./data-types.md#Azure.Core.RepeatabilityRequestHeaders)   |             |
| repeatableRequests.response   | [`RepeatabilityResponseHeaders`](./data-types.md#Azure.Core.RepeatabilityResponseHeaders) |             |

### `TraitOverride` {#Azure.Core.Traits.TraitOverride}

Used to override a trait.

```typespec
model Azure.Core.Traits.TraitOverride<Trait>
```

#### Template Parameters

| Name  | Description            |
| ----- | ---------------------- |
| Trait | The trait to override. |

#### Properties

None

### `VersionParameterTrait` {#Azure.Core.Traits.VersionParameterTrait}

Declares a version parameter trait.

```typespec
model Azure.Core.Traits.VersionParameterTrait<VersionParameter>
```

#### Template Parameters

| Name             | Description                        |
| ---------------- | ---------------------------------- |
| VersionParameter | The type of the version parameter. |

#### Properties

| Name                             | Type               | Description |
| -------------------------------- | ------------------ | ----------- |
| versionParameter                 | `{...}`            |             |
| versionParameter.apiVersionParam | `VersionParameter` |             |

### `TraitContext` {#Azure.Core.Traits.TraitContext}

Enumerates the standard trait contexts for Azure.Core operations.

```typespec
enum Azure.Core.Traits.TraitContext
```

| Name      | Value | Description                                                                                    |
| --------- | ----- | ---------------------------------------------------------------------------------------------- |
| Read      |       | Trait is applicable for resource 'read' operations.                                            |
| Create    |       | Trait is applicable for resource 'create' operations.                                          |
| Update    |       | Trait is applicable for resource 'update' operations.                                          |
| Delete    |       | Trait is applicable for resource 'delete' operations.                                          |
| List      |       | Trait is applicable for resource 'list' operations.                                            |
| Action    |       | Trait is applicable for resource actions.                                                      |
| Undefined |       | Only traits that did not specify a trait context (and therefore always apply) will be exposed. |

### `TraitLocation` {#Azure.Core.Traits.TraitLocation}

Enumerates the standard trait locations for Azure.Core operations.

```typespec
enum Azure.Core.Traits.TraitLocation
```

| Name                | Value | Description                                               |
| ------------------- | ----- | --------------------------------------------------------- |
| Parameters          |       | Identifies operation parameters as the trait target.      |
| Response            |       | Identifies operation response as the trait target.        |
| ApiVersionParameter |       | Identifies the API version parameter as the trait target. |
