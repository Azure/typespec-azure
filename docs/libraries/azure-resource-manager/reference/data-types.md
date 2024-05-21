---
title: "Data types"
toc_min_heading_level: 2
toc_max_heading_level: 3
---

# Data types

## Azure.ResourceManager

### `ApiVersionParameter` {#Azure.ResourceManager.ApiVersionParameter}

The default api-version parameter type.

```typespec
model Azure.ResourceManager.ApiVersionParameter
```

#### Properties

| Name       | Type     | Description                                |
| ---------- | -------- | ------------------------------------------ |
| apiVersion | `string` | The API version to use for this operation. |

### `ArmAcceptedLroResponse` {#Azure.ResourceManager.ArmAcceptedLroResponse}

```typespec
model Azure.ResourceManager.ArmAcceptedLroResponse<Description, LroHeaders>
```

#### Template Parameters

| Name        | Description                                                                        |
| ----------- | ---------------------------------------------------------------------------------- |
| Description | The description of the response status (defaults to `Resource operation accepted`) |
| LroHeaders  | Optional. The lro headers that appear in the Accepted response                     |

#### Properties

| Name       | Type  | Description      |
| ---------- | ----- | ---------------- |
| statusCode | `202` | The status code. |

### `ArmAcceptedResponse` {#Azure.ResourceManager.ArmAcceptedResponse}

```typespec
model Azure.ResourceManager.ArmAcceptedResponse<Message, ExtraHeaders>
```

#### Template Parameters

| Name         | Description                                                                        |
| ------------ | ---------------------------------------------------------------------------------- |
| Message      | The description of the response status (defaults to `Resource operation accepted`) |
| ExtraHeaders | Additional headers in the response. Default includes Retry-After header            |

#### Properties

| Name       | Type  | Description      |
| ---------- | ----- | ---------------- |
| statusCode | `202` | The status code. |

### `ArmAsyncOperationHeader` {#Azure.ResourceManager.ArmAsyncOperationHeader}

The standard header for asynchronous operation polling

```typespec
model Azure.ResourceManager.ArmAsyncOperationHeader<StatusMonitor, UrlValue>
```

#### Template Parameters

| Name          | Description                                       |
| ------------- | ------------------------------------------------- |
| StatusMonitor | The status monitor type for lro polling           |
| UrlValue      | The value type of the Azure-AsyncOperation header |

#### Properties

| Name                 | Type       | Description                  |
| -------------------- | ---------- | ---------------------------- |
| azureAsyncOperation? | `UrlValue` | A link to the status monitor |

### `ArmCombinedLroHeaders` {#Azure.ResourceManager.ArmCombinedLroHeaders}

Provide Both Azure-AsyncOperation and Location headers

```typespec
model Azure.ResourceManager.ArmCombinedLroHeaders<StatusMonitor, FinalResult, PollingUrlValue, FinalUrlValue>
```

#### Template Parameters

| Name            | Description                                                                       |
| --------------- | --------------------------------------------------------------------------------- |
| StatusMonitor   | The type of the polling StatusMonitor when following the Azure-AsyncOperation url |
| FinalResult     | The type of the logical result when following the location header                 |
| PollingUrlValue | The value type of the link to the status monitor                                  |
| FinalUrlValue   | The value type fo the link to the final result                                    |

#### Properties

| Name                 | Type              | Description                                                                                         |
| -------------------- | ----------------- | --------------------------------------------------------------------------------------------------- |
| azureAsyncOperation? | `PollingUrlValue` | A link to the status monitor                                                                        |
| location?            | `FinalUrlValue`   | The Location header contains the URL where the status of the long running operation can be checked. |

### `ArmCreatedResponse` {#Azure.ResourceManager.ArmCreatedResponse}

The Azure Resource Manager 201 response for a resource

```typespec
model Azure.ResourceManager.ArmCreatedResponse<ResponseBody, ExtraHeaders>
```

#### Template Parameters

| Name         | Description                                                             |
| ------------ | ----------------------------------------------------------------------- |
| ResponseBody | The contents of the response body                                       |
| ExtraHeaders | Additional headers in the response. Default includes Retry-After header |

#### Properties

| Name       | Type           | Description      |
| ---------- | -------------- | ---------------- |
| statusCode | `201`          | The status code. |
| body       | `ResponseBody` |                  |

### `ArmDeleteAcceptedLroResponse` {#Azure.ResourceManager.ArmDeleteAcceptedLroResponse}

```typespec
model Azure.ResourceManager.ArmDeleteAcceptedLroResponse<LroHeaders>
```

#### Template Parameters

| Name       | Description                                                           |
| ---------- | --------------------------------------------------------------------- |
| LroHeaders | Optional. Allows overriding the Lro headers returned in the response. |

#### Properties

| Name       | Type  | Description      |
| ---------- | ----- | ---------------- |
| statusCode | `202` | The status code. |

### `ArmDeleteAcceptedResponse` {#Azure.ResourceManager.ArmDeleteAcceptedResponse}

```typespec
model Azure.ResourceManager.ArmDeleteAcceptedResponse
```

#### Properties

| Name        | Type    | Description                                                                                              |
| ----------- | ------- | -------------------------------------------------------------------------------------------------------- |
| statusCode  | `202`   | The status code.                                                                                         |
| retryAfter? | `int32` | The Retry-After header can indicate how long the client should wait before polling the operation status. |

### `ArmDeletedNoContentResponse` {#Azure.ResourceManager.ArmDeletedNoContentResponse}

```typespec
model Azure.ResourceManager.ArmDeletedNoContentResponse
```

#### Properties

| Name       | Type  | Description      |
| ---------- | ----- | ---------------- |
| statusCode | `204` | The status code. |

### `ArmDeletedResponse` {#Azure.ResourceManager.ArmDeletedResponse}

The response for synchronous delete of a resource

```typespec
model Azure.ResourceManager.ArmDeletedResponse
```

#### Properties

| Name       | Type  | Description      |
| ---------- | ----- | ---------------- |
| statusCode | `200` | The status code. |

### `ArmLocationResource` {#Azure.ResourceManager.ArmLocationResource}

Template for ARM location resources. Use the parameter to specify

```typespec
model Azure.ResourceManager.ArmLocationResource<BaseType>
```

#### Template Parameters

| Name     | Description |
| -------- | ----------- |
| BaseType |             |

#### Properties

| Name     | Type     | Description        |
| -------- | -------- | ------------------ |
| location | `string` | The location name. |

### `ArmLroLocationHeader` {#Azure.ResourceManager.ArmLroLocationHeader}

The default header for lro PUT and DELETE polling

```typespec
model Azure.ResourceManager.ArmLroLocationHeader<LroPollingOptions, FinalResult, UrlValue>
```

#### Template Parameters

| Name              | Description                                                     |
| ----------------- | --------------------------------------------------------------- |
| LroPollingOptions | The polling options when polling the url in the location header |
| FinalResult       | The ultimate final result of the logical operation              |
| UrlValue          | The value type for the location header                          |

#### Properties

| Name      | Type       | Description                                                                                         |
| --------- | ---------- | --------------------------------------------------------------------------------------------------- |
| location? | `UrlValue` | The Location header contains the URL where the status of the long running operation can be checked. |

### `ArmNoContentResponse` {#Azure.ResourceManager.ArmNoContentResponse}

Standard Azure Resource Manager NoContent (204) response

```typespec
model Azure.ResourceManager.ArmNoContentResponse<Message>
```

#### Template Parameters

| Name    | Description                                                                             |
| ------- | --------------------------------------------------------------------------------------- |
| Message | The description of the response status (defaults to `Operation completed successfully`) |

#### Properties

| Name       | Type  | Description      |
| ---------- | ----- | ---------------- |
| statusCode | `204` | The status code. |

### `ArmOperationStatus` {#Azure.ResourceManager.ArmOperationStatus}

Standard Azure Resource Manager operation status response

```typespec
model Azure.ResourceManager.ArmOperationStatus<Properties, StatusValues>
```

#### Template Parameters

| Name         | Description                                    |
| ------------ | ---------------------------------------------- |
| Properties   | Optional resource-specific properties          |
| StatusValues | The set of allowed values for operation status |

#### Properties

| Name             | Type                                                                           | Description                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| properties?      | `Properties`                                                                   | RP-specific properties for the operationStatus resource, only appears when operation ended with Succeeded status |
| status           | `StatusValues`                                                                 | The operation status                                                                                             |
| id               | `Core.uuid`                                                                    | The unique identifier for the operationStatus resource                                                           |
| name?            | `string`                                                                       | The name of the operationStatus resource                                                                         |
| startTime?       | `utcDateTime`                                                                  | Operation start time                                                                                             |
| endTime?         | `utcDateTime`                                                                  | Operation complete time                                                                                          |
| percentComplete? | `float64`                                                                      | The progress made toward completing the operation                                                                |
| error?           | [`ErrorDetail`](./data-types.md#Azure.ResourceManager.Foundations.ErrorDetail) | Errors that occurred if the operation ended with Canceled or Failed status                                       |

### `ArmResourceCreatedResponse` {#Azure.ResourceManager.ArmResourceCreatedResponse}

```typespec
model Azure.ResourceManager.ArmResourceCreatedResponse<Resource, LroHeaders>
```

#### Template Parameters

| Name       | Description                                                |
| ---------- | ---------------------------------------------------------- |
| Resource   | The resource being updated                                 |
| LroHeaders | Optional. The lro headers returned with a Created response |

#### Properties

| Name       | Type       | Description      |
| ---------- | ---------- | ---------------- |
| statusCode | `201`      | The status code. |
| body       | `Resource` |                  |

### `ArmResourceCreatedSyncResponse` {#Azure.ResourceManager.ArmResourceCreatedSyncResponse}

```typespec
model Azure.ResourceManager.ArmResourceCreatedSyncResponse<Resource>
```

#### Template Parameters

| Name     | Description                |
| -------- | -------------------------- |
| Resource | The resource being updated |

#### Properties

| Name       | Type       | Description      |
| ---------- | ---------- | ---------------- |
| statusCode | `201`      | The status code. |
| body       | `Resource` |                  |

### `ArmResourceExistsResponse` {#Azure.ResourceManager.ArmResourceExistsResponse}

```typespec
model Azure.ResourceManager.ArmResourceExistsResponse
```

#### Properties

| Name       | Type  | Description      |
| ---------- | ----- | ---------------- |
| statusCode | `204` | The status code. |

### `ArmResourceNotFoundResponse` {#Azure.ResourceManager.ArmResourceNotFoundResponse}

```typespec
model Azure.ResourceManager.ArmResourceNotFoundResponse
```

#### Properties

| Name       | Type  | Description      |
| ---------- | ----- | ---------------- |
| statusCode | `404` | The status code. |

### `ArmResourceUpdatedResponse` {#Azure.ResourceManager.ArmResourceUpdatedResponse}

```typespec
model Azure.ResourceManager.ArmResourceUpdatedResponse<Resource>
```

#### Template Parameters

| Name     | Description                |
| -------- | -------------------------- |
| Resource | The resource being updated |

#### Properties

| Name       | Type       | Description                                         |
| ---------- | ---------- | --------------------------------------------------- |
| statusCode | `200`      | The status code.                                    |
| body       | `Resource` | The body type of the operation request or response. |

### `ArmResponse` {#Azure.ResourceManager.ArmResponse}

The Azure Resource Manager synchronous OK response

```typespec
model Azure.ResourceManager.ArmResponse<ResponseBody>
```

#### Template Parameters

| Name         | Description                       |
| ------------ | --------------------------------- |
| ResponseBody | The contents of the response body |

#### Properties

| Name       | Type           | Description      |
| ---------- | -------------- | ---------------- |
| statusCode | `200`          | The status code. |
| body       | `ResponseBody` |                  |

### `CustomerManagedKeyEncryption` {#Azure.ResourceManager.CustomerManagedKeyEncryption}

Customer-managed key encryption properties for the resource.

```typespec
model Azure.ResourceManager.CustomerManagedKeyEncryption
```

#### Properties

| Name                            | Type                                                                                         | Description                                                                                                                                                                                                                                                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| keyEncryptionKeyIdentity?       | [`KeyEncryptionKeyIdentity`](./data-types.md#Azure.ResourceManager.KeyEncryptionKeyIdentity) | The type of identity to use. Values can be systemAssignedIdentity, userAssignedIdentity, or delegatedResourceIdentity.                                                                                                                                                                                                             |
| userAssignedIdentityResourceId? | `Core.armResourceIdentifier`                                                                 | User assigned identity to use for accessing key encryption key Url. Ex: /subscriptions/fa5fc227-a624-475e-b696-cdd604c735bc/resourceGroups/<resource group>/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myId. Mutually exclusive with identityType systemAssignedIdentity.                                          |
| federatedClientId?              | `Core.uuid`                                                                                  | application client identity to use for accessing key encryption key Url in a different tenant. Ex: f83c6b1b-4d34-47e4-bb34-9d83df58b540                                                                                                                                                                                            |
| delegatedIdentityClientId?      | `Core.uuid`                                                                                  | delegated identity to use for accessing key encryption key Url. Ex: /subscriptions/fa5fc227-a624-475e-b696-cdd604c735bc/resourceGroups/<resource group>/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myId. Mutually exclusive with identityType systemAssignedIdentity and userAssignedIdentity - internal use only. |

### `DefaultProvisioningStateProperty` {#Azure.ResourceManager.DefaultProvisioningStateProperty}

Standard resource provisioning state model. If you do not have any custom provisioning state,
you can spread this model directly into your resource property model.

```typespec
model Azure.ResourceManager.DefaultProvisioningStateProperty
```

#### Examples

```typespec
model FooProperties {
  // Only have standard Succeeded, Failed, Cancelled states
  ...DefaultProvisioningStateProperty;
}
```

#### Properties

| Name               | Type                                                                                           | Description                             |
| ------------------ | ---------------------------------------------------------------------------------------------- | --------------------------------------- |
| provisioningState? | [`ResourceProvisioningState`](./data-types.md#Azure.ResourceManager.ResourceProvisioningState) | The provisioning state of the resource. |

### `Encryption` {#Azure.ResourceManager.Encryption}

Model used only to spread in the `encryption` envelope property for a resource.

```typespec
model Azure.ResourceManager.Encryption
```

#### Examples

```typespec
model Foo is TrackedResource<FooProperties> {
  ...Encryption;
}
```

#### Properties

| Name       | Type                                                                                       | Description                                  |
| ---------- | ------------------------------------------------------------------------------------------ | -------------------------------------------- |
| encryption | [`EncryptionConfiguration`](./data-types.md#Azure.ResourceManager.EncryptionConfiguration) | All encryption configuration for a resource. |

### `EncryptionConfiguration` {#Azure.ResourceManager.EncryptionConfiguration}

All encryption configuration for a resource.

```typespec
model Azure.ResourceManager.EncryptionConfiguration
```

#### Properties

| Name                          | Type                                                                                                 | Description                                                                                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| infrastructureEncryption?     | [`InfrastructureEncryption`](./data-types.md#Azure.ResourceManager.InfrastructureEncryption)         | Indicates if infrastructure encryption is enabled or disabled.                                                                                                                                       |
| customerManagedKeyEncryption? | [`CustomerManagedKeyEncryption`](./data-types.md#Azure.ResourceManager.CustomerManagedKeyEncryption) | All customer-managed key encryption properties for the resource.                                                                                                                                     |
| keyEncryptionKeyUrl?          | `string`                                                                                             | key encryption key Url, versioned or unversioned. Ex: https://contosovault.vault.azure.net/keys/contosokek/562a4bb76b524a1493a6afe8e536ee78 or https://contosovault.vault.azure.net/keys/contosokek. |

### `EntityTagProperty` {#Azure.ResourceManager.EntityTagProperty}

Model used only to spread in the standard `eTag` envelope property for a resource

```typespec
model Azure.ResourceManager.EntityTagProperty
```

#### Examples

```typespec
model Foo is TrackedResource<FooProperties> {
  // Only have standard Succeeded, Failed, Cancelled states
  ...EntityTagProperty;
}
```

#### Properties

| Name  | Type     | Description                                                                                                                                                                                                                                                                                                                                                         |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| eTag? | `string` | If eTag is provided in the response body, it may also be provided as a header per the normal etag convention. Entity tags are used for comparing two or more entities from the same requested resource. HTTP/1.1 uses entity tags in the etag (section 14.19), If-Match (section 14.24), If-None-Match (section 14.26), and If-Range (section 14.27) header fields. |

### `ErrorResponse` {#Azure.ResourceManager.ErrorResponse}

The standard Azure Resource Manager error response

```typespec
model Azure.ResourceManager.ErrorResponse
```

#### Properties

| Name   | Type                                                                           | Description       |
| ------ | ------------------------------------------------------------------------------ | ----------------- |
| error? | [`ErrorDetail`](./data-types.md#Azure.ResourceManager.Foundations.ErrorDetail) | The error object. |

### `ExtendedLocationProperty` {#Azure.ResourceManager.ExtendedLocationProperty}

Model representing the standard `extendedLocation` envelope property for a resource.
Spread this model into a Resource Model, if the resource supports extended locations

```typespec
model Azure.ResourceManager.ExtendedLocationProperty
```

#### Examples

```typespec
model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
  ...ExtendedLocationProperty;
}
```

#### Properties

| Name              | Type                                                                                     | Description |
| ----------------- | ---------------------------------------------------------------------------------------- | ----------- |
| extendedLocation? | [`ExtendedLocation`](./data-types.md#Azure.ResourceManager.Foundations.ExtendedLocation) |             |

### `ExtensionResource` {#Azure.ResourceManager.ExtensionResource}

Concrete extension resource types can be created by aliasing this type using a specific property type.

See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)

```typespec
model Azure.ResourceManager.ExtensionResource<Properties>
```

#### Template Parameters

| Name       | Description                                                           |
| ---------- | --------------------------------------------------------------------- |
| Properties | A model containing the provider-specific properties for this resource |

#### Properties

| Name        | Type         | Description |
| ----------- | ------------ | ----------- |
| properties? | `Properties` |             |

### `KeysOf` {#Azure.ResourceManager.KeysOf}

Extracts the key (path) parameters from a resource and its parents

```typespec
model Azure.ResourceManager.KeysOf<Resource>
```

#### Template Parameters

| Name     | Description                             |
| -------- | --------------------------------------- |
| Resource | The resource to extract properties from |

#### Properties

None

### `LocationParameter` {#Azure.ResourceManager.LocationParameter}

DEPRECATED - DO NOT USE
The default location parameter type.

```typespec
model Azure.ResourceManager.LocationParameter
```

#### Properties

| Name     | Type     | Description        |
| -------- | -------- | ------------------ |
| location | `string` | The location name. |

### `LocationResourceParameter` {#Azure.ResourceManager.LocationResourceParameter}

The default location parameter type.

```typespec
model Azure.ResourceManager.LocationResourceParameter
```

#### Properties

| Name     | Type     | Description        |
| -------- | -------- | ------------------ |
| location | `string` | The location name. |

### `ManagedByProperty` {#Azure.ResourceManager.ManagedByProperty}

Model representing the standard `managedBy` envelope property for a resource.
Spread this model into a resource model if the resource is managed by another entity.

```typespec
model Azure.ResourceManager.ManagedByProperty
```

#### Examples

```typespec
model Foo is TrackedResource<FooProperties> {
  // Only have standard Succeeded, Failed, Cancelled states
  ...ManagedByProperty;
}
```

#### Properties

| Name       | Type     | Description                                                                                                                                                                                                                                                                                        |
| ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| managedBy? | `string` | The fully qualified resource ID of the resource that manages this resource. Indicates if this resource is managed by another Azure resource. If this is present, complete mode deployment will not delete the resource if it is removed from the template since it is managed by another resource. |

### `ManagedServiceIdentityProperty` {#Azure.ResourceManager.ManagedServiceIdentityProperty}

Model representing the standard `ManagedServiceIdentity` envelope property for a resource.
Spread this model into a resource model if the resource supports both system-assigned and user-assigned managed identities.

```typespec
model Azure.ResourceManager.ManagedServiceIdentityProperty
```

#### Examples

```typespec
model Foo is TrackedResource<FooProperties> {
  ...ResourceNameParameter<Foo>;
  ...ManagedServiceIdentityProperty;
}
```

#### Properties

| Name      | Type                                                                                                 | Description                                               |
| --------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| identity? | [`ManagedServiceIdentity`](./data-types.md#Azure.ResourceManager.Foundations.ManagedServiceIdentity) | The managed service identities assigned to this resource. |

### `ManagedSystemAssignedIdentityProperty` {#Azure.ResourceManager.ManagedSystemAssignedIdentityProperty}

Model representing the standard `SystemAssignedServiceIdentity` envelope property for a resource.
Spread this model into a resource model if the resource supports system-assigned managed identities
but does not support user-assigned managed identities.

```typespec
model Azure.ResourceManager.ManagedSystemAssignedIdentityProperty
```

#### Examples

```typespec
model Foo is TrackedResource<FooProperties> {
  ...ResourceNameParameter<Foo>;
  ...ManagedSystemAssignedIdentityProperty;
}
```

#### Properties

| Name      | Type                                                                                                               | Description                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| identity? | [`SystemAssignedServiceIdentity`](./data-types.md#Azure.ResourceManager.Foundations.SystemAssignedServiceIdentity) | The managed service identities assigned to this resource. |

### `ParentKeysOf` {#Azure.ResourceManager.ParentKeysOf}

Extracts the key (path) parameters from the parent(s) of the given resource

```typespec
model Azure.ResourceManager.ParentKeysOf<Resource>
```

#### Template Parameters

| Name     | Description                             |
| -------- | --------------------------------------- |
| Resource | The resource to extract properties from |

#### Properties

None

### `PrivateEndpoint` {#Azure.ResourceManager.PrivateEndpoint}

The private endpoint resource

```typespec
model Azure.ResourceManager.PrivateEndpoint
```

#### Properties

| Name | Type                         | Description                                  |
| ---- | ---------------------------- | -------------------------------------------- |
| id?  | `Core.armResourceIdentifier` | The resource identifier for private endpoint |

### `PrivateEndpointConnection` {#Azure.ResourceManager.PrivateEndpointConnection}

The private endpoint connection resource

```typespec
model Azure.ResourceManager.PrivateEndpointConnection
```

#### Properties

| Name        | Type                                                                                                               | Description                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| properties? | [`PrivateEndpointConnectionProperties`](./data-types.md#Azure.ResourceManager.PrivateEndpointConnectionProperties) | The private endpoint connection properties |

### `PrivateEndpointConnectionParameter` {#Azure.ResourceManager.PrivateEndpointConnectionParameter}

The name of the private endpoint connection associated with the Azure resource.

```typespec
model Azure.ResourceManager.PrivateEndpointConnectionParameter<Segment>
```

#### Template Parameters

| Name    | Description                                                                                     |
| ------- | ----------------------------------------------------------------------------------------------- |
| Segment | The resource type name for private endpoint connections (default is privateEndpointConnections) |

#### Properties

| Name | Type     | Description                                                                     |
| ---- | -------- | ------------------------------------------------------------------------------- |
| name | `string` | The name of the private endpoint connection associated with the Azure resource. |

### `PrivateEndpointConnectionProperties` {#Azure.ResourceManager.PrivateEndpointConnectionProperties}

Properties of he private endpoint connection resource

```typespec
model Azure.ResourceManager.PrivateEndpointConnectionProperties
```

#### Properties

| Name                              | Type                                                                                                                             | Description                                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| groupIds?                         | `string[]`                                                                                                                       | The group identifiers for the private endpoint resource                                              |
| privateEndpoint?                  | [`PrivateEndpoint`](./data-types.md#Azure.ResourceManager.PrivateEndpoint)                                                       | The private endpoint resource                                                                        |
| privateLinkServiceConnectionState | [`PrivateLinkServiceConnectionState`](./data-types.md#Azure.ResourceManager.PrivateLinkServiceConnectionState)                   | A collection of information about the state of the connection between service consumer and provider. |
| provisioningState?                | [`PrivateEndpointConnectionProvisioningState`](./data-types.md#Azure.ResourceManager.PrivateEndpointConnectionProvisioningState) | The provisioning state of the private endpoint connection resource.                                  |

### `PrivateEndpointConnectionResourceListResult` {#Azure.ResourceManager.PrivateEndpointConnectionResourceListResult}

List of private endpoint connections associated with the specified resource.

```typespec
model Azure.ResourceManager.PrivateEndpointConnectionResourceListResult
```

#### Properties

| Name   | Type                                          | Description                           |
| ------ | --------------------------------------------- | ------------------------------------- |
| value? | `ResourceManager.PrivateEndpointConnection[]` | Array of private endpoint connections |

### `PrivateLinkResource` {#Azure.ResourceManager.PrivateLinkResource}

```typespec
model Azure.ResourceManager.PrivateLinkResource
```

#### Properties

| Name        | Type                                                                                                   | Description                              |
| ----------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| properties? | [`PrivateLinkResourceProperties`](./data-types.md#Azure.ResourceManager.PrivateLinkResourceProperties) | Properties of the private link resource. |

### `PrivateLinkResourceListResult` {#Azure.ResourceManager.PrivateLinkResourceListResult}

A list of private link resources.

```typespec
model Azure.ResourceManager.PrivateLinkResourceListResult
```

#### Properties

| Name   | Type                                    | Description                     |
| ------ | --------------------------------------- | ------------------------------- |
| value? | `ResourceManager.PrivateLinkResource[]` | Array of private link resources |

### `PrivateLinkResourceParameter` {#Azure.ResourceManager.PrivateLinkResourceParameter}

The name of the private link associated with the Azure resource.

```typespec
model Azure.ResourceManager.PrivateLinkResourceParameter<Segment>
```

#### Template Parameters

| Name    | Description                                                                |
| ------- | -------------------------------------------------------------------------- |
| Segment | The resource type name for private links (default is privateLinkResources) |

#### Properties

| Name | Type     | Description                                                      |
| ---- | -------- | ---------------------------------------------------------------- |
| name | `string` | The name of the private link associated with the Azure resource. |

### `PrivateLinkResourceProperties` {#Azure.ResourceManager.PrivateLinkResourceProperties}

Properties of a private link resource.

```typespec
model Azure.ResourceManager.PrivateLinkResourceProperties
```

#### Properties

| Name               | Type       | Description                                           |
| ------------------ | ---------- | ----------------------------------------------------- |
| groupId?           | `string`   | The private link resource group id.                   |
| requiredMembers?   | `string[]` | The private link resource required member names.      |
| requiredZoneNames? | `string[]` | The private link resource private link DNS zone name. |

### `PrivateLinkServiceConnectionState` {#Azure.ResourceManager.PrivateLinkServiceConnectionState}

A collection of information about the state of the connection between service consumer and provider.

```typespec
model Azure.ResourceManager.PrivateLinkServiceConnectionState
```

#### Properties

| Name             | Type                                                                                                                     | Description                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| status?          | [`PrivateEndpointServiceConnectionStatus`](./data-types.md#Azure.ResourceManager.PrivateEndpointServiceConnectionStatus) | Indicates whether the connection has been Approved/Rejected/Removed by the owner of the service. |
| description?     | `string`                                                                                                                 | The reason for approval/rejection of the connection.                                             |
| actionsRequired? | `string`                                                                                                                 | A message indicating if changes on the service provider require any updates on the consumer.     |

### `ProviderNamespace` {#Azure.ResourceManager.ProviderNamespace}

Model describing the provider namespace.

```typespec
model Azure.ResourceManager.ProviderNamespace<Resource>
```

#### Template Parameters

| Name     | Description                             |
| -------- | --------------------------------------- |
| Resource | The resource provided by the namespace. |

#### Properties

| Name     | Type                             | Description |
| -------- | -------------------------------- | ----------- |
| provider | `"Microsoft.ThisWillBeReplaced"` |             |

### `ProxyResource` {#Azure.ResourceManager.ProxyResource}

Concrete proxy resource types can be created by aliasing this type using a specific property type.

See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)

```typespec
model Azure.ResourceManager.ProxyResource<Properties>
```

#### Template Parameters

| Name       | Description                                                           |
| ---------- | --------------------------------------------------------------------- |
| Properties | A model containing the provider-specific properties for this resource |

#### Properties

| Name        | Type         | Description |
| ----------- | ------------ | ----------- |
| properties? | `Properties` |             |

### `ResourceGroupLocationResource` {#Azure.ResourceManager.ResourceGroupLocationResource}

The location resource for resourceGroup-based locations. This can be used as a parent
resource for resource types that are homed in a resourceGroup-based location.

```typespec
model Azure.ResourceManager.ResourceGroupLocationResource
```

#### Properties

| Name     | Type     | Description        |
| -------- | -------- | ------------------ |
| location | `string` | The location name. |

### `ResourceGroupParameter` {#Azure.ResourceManager.ResourceGroupParameter}

The default resource group parameter type.

```typespec
model Azure.ResourceManager.ResourceGroupParameter
```

#### Properties

| Name              | Type     | Description                                                   |
| ----------------- | -------- | ------------------------------------------------------------- |
| resourceGroupName | `string` | The name of the resource group. The name is case insensitive. |

### `ResourceInstanceParameters` {#Azure.ResourceManager.ResourceInstanceParameters}

The dynamic parameters of a resource instance - pass in the proper base type to indicate
where the resource is based. The default is in a resource group

```typespec
model Azure.ResourceManager.ResourceInstanceParameters<Resource, BaseParameters>
```

#### Template Parameters

| Name           | Description                                              |
| -------------- | -------------------------------------------------------- |
| Resource       | The resource to get parameters for                       |
| BaseParameters | The parameters representing the base Uri of the resource |

#### Properties

| Name     | Type                             | Description |
| -------- | -------------------------------- | ----------- |
| provider | `"Microsoft.ThisWillBeReplaced"` |             |

### `ResourceKindProperty` {#Azure.ResourceManager.ResourceKindProperty}

Model representing the standard `kind` envelope property for a resource.
Spread this model into a resource model if the resource support ARM `kind`.

```typespec
model Azure.ResourceManager.ResourceKindProperty
```

#### Examples

```typespec
model Foo is TrackedResource<FooProperties> {
  // Only have standard Succeeded, Failed, Cancelled states
  ...ResourceKindProperty;
}
```

#### Properties

| Name  | Type     | Description                                                                                                                                                                                                                           |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| kind? | `string` | Metadata used by portal/tooling/etc to render different UX experiences for resources of the same type; e.g. ApiApps are a kind of Microsoft.Web/sites type. If supported, the resource provider must validate and persist this value. |

### `ResourceListResult` {#Azure.ResourceManager.ResourceListResult}

Paged response containing resources

```typespec
model Azure.ResourceManager.ResourceListResult<Resource>
```

#### Template Parameters

| Name     | Description                                                                |
| -------- | -------------------------------------------------------------------------- |
| Resource | The type of the values returned in the paged response (must be a resource) |

#### Properties

| Name      | Type                             | Description                        |
| --------- | -------------------------------- | ---------------------------------- |
| value     | `Array<Element>`                 | The {name} items on this page      |
| nextLink? | `TypeSpec.Rest.ResourceLocation` | The link to the next page of items |

### `ResourceNameParameter` {#Azure.ResourceManager.ResourceNameParameter}

Spread this model into ARM resource models to specify resource name parameter for its operations. If `Resource` parameter
is specified, the resource name will be properly camel cased and pluralized for `@key` and `@segment`
automatically. You can also apply explicit override with `KeyName` and `SegmentName` template parameters.

```typespec
model Azure.ResourceManager.ResourceNameParameter<Resource, KeyName, SegmentName, NamePattern>
```

#### Template Parameters

| Name        | Description                                                       |
| ----------- | ----------------------------------------------------------------- |
| Resource    | The ARM resource this name parameter is applying to.              |
| KeyName     | Override default key name of the resource.                        |
| SegmentName | Override default segment name of the resource.                    |
| NamePattern | The RegEx pattern of the name. Default is `^[a-zA-Z0-9-]{3,24}$`. |

#### Properties

| Name | Type     | Description |
| ---- | -------- | ----------- |
| name | `string` |             |

### `ResourceParentParameters` {#Azure.ResourceManager.ResourceParentParameters}

The dynamic parameters of a list call for a resource instance - pass in the proper base type to indicate
where the list should take place. The default is in a resource group

```typespec
model Azure.ResourceManager.ResourceParentParameters<Resource, BaseParameters>
```

#### Template Parameters

| Name           | Description                                              |
| -------------- | -------------------------------------------------------- |
| Resource       | The resource to get parameters for                       |
| BaseParameters | The parameters representing the base Uri of the resource |

#### Properties

| Name     | Type                             | Description |
| -------- | -------------------------------- | ----------- |
| provider | `"Microsoft.ThisWillBeReplaced"` |             |

### `ResourcePlanProperty` {#Azure.ResourceManager.ResourcePlanProperty}

Model representing the standard `plan` envelope property for a resource.
Spread this model into a resource Model if the resource supports ARM `plan`.

```typespec
model Azure.ResourceManager.ResourcePlanProperty
```

#### Examples

```typespec
model Foo is TrackedResource<FooProperties> {
  // Only have standard Succeeded, Failed, Cancelled states
  ...ResourcePlanProperty;
}
```

#### Properties

| Name  | Type                                                             | Description                   |
| ----- | ---------------------------------------------------------------- | ----------------------------- |
| plan? | [`Plan`](./data-types.md#Azure.ResourceManager.Foundations.Plan) | Details of the resource plan. |

### `ResourceSkuProperty` {#Azure.ResourceManager.ResourceSkuProperty}

Model representing the standard `sku` envelope property for a resource.
Spread this model into a resource model if the resource supports standard ARM `sku`.

```typespec
model Azure.ResourceManager.ResourceSkuProperty
```

#### Examples

```typespec
model Foo is TrackedResource<FooProperties> {
  // Only have standard Succeeded, Failed, Cancelled states
  ...ResourceSkuProperty;
}
```

#### Properties

| Name | Type                                                           | Description                                             |
| ---- | -------------------------------------------------------------- | ------------------------------------------------------- |
| sku? | [`Sku`](./data-types.md#Azure.ResourceManager.Foundations.Sku) | The SKU (Stock Keeping Unit) assigned to this resource. |

### `ResourceUriParameter` {#Azure.ResourceManager.ResourceUriParameter}

The default resourceUri parameter type.

```typespec
model Azure.ResourceManager.ResourceUriParameter
```

#### Properties

| Name        | Type     | Description                                                            |
| ----------- | -------- | ---------------------------------------------------------------------- |
| resourceUri | `string` | The fully qualified Azure Resource manager identifier of the resource. |

### `SubscriptionIdParameter` {#Azure.ResourceManager.SubscriptionIdParameter}

The default subscriptionId parameter type.

```typespec
model Azure.ResourceManager.SubscriptionIdParameter
```

#### Properties

| Name           | Type     | Description                        |
| -------------- | -------- | ---------------------------------- |
| subscriptionId | `string` | The ID of the target subscription. |

### `SubscriptionLocationResource` {#Azure.ResourceManager.SubscriptionLocationResource}

The location resource for subscription-based locations. This can be used as a parent
resource for resource types that are homed in a subscription-based location.

```typespec
model Azure.ResourceManager.SubscriptionLocationResource
```

#### Properties

| Name     | Type     | Description        |
| -------- | -------- | ------------------ |
| location | `string` | The location name. |

### `TenantLocationResource` {#Azure.ResourceManager.TenantLocationResource}

The location resource for tenant-based locations. This can be used as a parent
resource for resource types that are homed in a tenant-based location.

```typespec
model Azure.ResourceManager.TenantLocationResource
```

#### Properties

| Name     | Type     | Description        |
| -------- | -------- | ------------------ |
| location | `string` | The location name. |

### `TrackedResource` {#Azure.ResourceManager.TrackedResource}

Concrete tracked resource types can be created by aliasing this type using a specific property type.

See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)

```typespec
model Azure.ResourceManager.TrackedResource<Properties>
```

#### Template Parameters

| Name       | Description                                                           |
| ---------- | --------------------------------------------------------------------- |
| Properties | A model containing the provider-specific properties for this resource |

#### Properties

| Name        | Type         | Description |
| ----------- | ------------ | ----------- |
| properties? | `Properties` |             |

### `Versions` {#Azure.ResourceManager.Versions}

Supported versions of Azure.ResourceManager building blocks.

```typespec
enum Azure.ResourceManager.Versions
```

### `InfrastructureEncryption` {#Azure.ResourceManager.InfrastructureEncryption}

(Optional) Discouraged to include in resource definition. Only needed where it is possible to disable platform (AKA infrastructure) encryption. Azure SQL TDE is an example of this. Values are enabled and disabled.

```typespec
union Azure.ResourceManager.InfrastructureEncryption
```

### `KeyEncryptionKeyIdentity` {#Azure.ResourceManager.KeyEncryptionKeyIdentity}

The type of identity to use.

```typespec
union Azure.ResourceManager.KeyEncryptionKeyIdentity
```

### `PrivateEndpointConnectionProvisioningState` {#Azure.ResourceManager.PrivateEndpointConnectionProvisioningState}

The provisioning state of the connection

```typespec
union Azure.ResourceManager.PrivateEndpointConnectionProvisioningState
```

### `PrivateEndpointServiceConnectionStatus` {#Azure.ResourceManager.PrivateEndpointServiceConnectionStatus}

The private endpoint connection status

```typespec
union Azure.ResourceManager.PrivateEndpointServiceConnectionStatus
```

### `ResourceProvisioningState` {#Azure.ResourceManager.ResourceProvisioningState}

Standard terminal provisioning state of resource type. You can include in your
custom provision state to avoid duplication and ensure consistency

```typespec
union Azure.ResourceManager.ResourceProvisioningState
```

#### Examples

```typespec
union FooProvisioningState {
  ResourceProvisioningState, // include standard provisioning states
  starting: "starting",
  started: "started",
  stopping: "stopping",
  stopped: "stopped",
}
```

## Azure.ResourceManager.CommonTypes

### `Versions` {#Azure.ResourceManager.CommonTypes.Versions}

The Azure Resource Manager common-types versions.

```typespec
enum Azure.ResourceManager.CommonTypes.Versions
```

## Azure.ResourceManager.Foundations

### `ArmTagsProperty` {#Azure.ResourceManager.Foundations.ArmTagsProperty}

Standard type definition for Azure Resource Manager Tags property.

It is included in the TrackedResource template definition.

```typespec
model Azure.ResourceManager.Foundations.ArmTagsProperty
```

#### Properties

| Name  | Type             | Description    |
| ----- | ---------------- | -------------- |
| tags? | `Record<string>` | Resource tags. |

### `AzureEntityResource` {#Azure.ResourceManager.Foundations.AzureEntityResource}

The resource model definition for an Azure Resource Manager resource with an etag.

```typespec
model Azure.ResourceManager.Foundations.AzureEntityResource
```

#### Properties

| Name | Type     | Description    |
| ---- | -------- | -------------- |
| etag | `string` | Resource Etag. |

### `CheckNameAvailabilityRequest` {#Azure.ResourceManager.Foundations.CheckNameAvailabilityRequest}

The check availability request body.

```typespec
model Azure.ResourceManager.Foundations.CheckNameAvailabilityRequest
```

#### Properties

| Name  | Type     | Description                                                          |
| ----- | -------- | -------------------------------------------------------------------- |
| name? | `string` | The name of the resource for which availability needs to be checked. |
| type? | `string` | The resource type.                                                   |

### `CheckNameAvailabilityResponse` {#Azure.ResourceManager.Foundations.CheckNameAvailabilityResponse}

The check availability result.

```typespec
model Azure.ResourceManager.Foundations.CheckNameAvailabilityResponse
```

#### Properties

| Name           | Type                                                                                                           | Description                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| nameAvailable? | `boolean`                                                                                                      | Indicates if the resource name is available.         |
| reason?        | [`CheckNameAvailabilityReason`](./data-types.md#Azure.ResourceManager.Foundations.CheckNameAvailabilityReason) | The reason why the given name is not available.      |
| message?       | `string`                                                                                                       | Detailed reason why the given name is not available. |

### `DefaultBaseParameters` {#Azure.ResourceManager.Foundations.DefaultBaseParameters}

Base parameters for a resource.

```typespec
model Azure.ResourceManager.Foundations.DefaultBaseParameters<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

#### Properties

| Name              | Type     | Description                                                            |
| ----------------- | -------- | ---------------------------------------------------------------------- |
| apiVersion        | `string` | The API version to use for this operation.                             |
| subscriptionId    | `string` | The ID of the target subscription.                                     |
| location          | `string` | The location name.                                                     |
| resourceGroupName | `string` | The name of the resource group. The name is case insensitive.          |
| resourceUri       | `string` | The fully qualified Azure Resource manager identifier of the resource. |

### `ErrorAdditionalInfo` {#Azure.ResourceManager.Foundations.ErrorAdditionalInfo}

The resource management error additional info.

```typespec
model Azure.ResourceManager.Foundations.ErrorAdditionalInfo
```

#### Properties

| Name  | Type     | Description               |
| ----- | -------- | ------------------------- |
| type? | `string` | The additional info type. |
| info? | `{}`     | The additional info.      |

### `ErrorDetail` {#Azure.ResourceManager.Foundations.ErrorDetail}

The error detail.

```typespec
model Azure.ResourceManager.Foundations.ErrorDetail
```

#### Properties

| Name            | Type                                                | Description                |
| --------------- | --------------------------------------------------- | -------------------------- |
| code?           | `string`                                            | The error code.            |
| message?        | `string`                                            | The error message.         |
| target?         | `string`                                            | The error target.          |
| details?        | `ResourceManager.Foundations.ErrorDetail[]`         | The error details.         |
| additionalInfo? | `ResourceManager.Foundations.ErrorAdditionalInfo[]` | The error additional info. |

### `ExtendedLocation` {#Azure.ResourceManager.Foundations.ExtendedLocation}

The complex type of the extended location.

```typespec
model Azure.ResourceManager.Foundations.ExtendedLocation
```

#### Properties

| Name | Type                                                                                             | Description                        |
| ---- | ------------------------------------------------------------------------------------------------ | ---------------------------------- |
| name | `string`                                                                                         | The name of the extended location. |
| type | [`ExtendedLocationType`](./data-types.md#Azure.ResourceManager.Foundations.ExtendedLocationType) | The type of the extended location. |

### `ExtensionBaseParameters` {#Azure.ResourceManager.Foundations.ExtensionBaseParameters}

The static parameters for an extension resource

```typespec
model Azure.ResourceManager.Foundations.ExtensionBaseParameters
```

#### Properties

| Name        | Type     | Description                                                            |
| ----------- | -------- | ---------------------------------------------------------------------- |
| apiVersion  | `string` | The API version to use for this operation.                             |
| resourceUri | `string` | The fully qualified Azure Resource manager identifier of the resource. |

### `ExtensionResource` {#Azure.ResourceManager.Foundations.ExtensionResource}

The base extension resource.

```typespec
model Azure.ResourceManager.Foundations.ExtensionResource
```

#### Properties

None

### `ExtensionScope` {#Azure.ResourceManager.Foundations.ExtensionScope}

Parameter model for listing an extension resource

```typespec
model Azure.ResourceManager.Foundations.ExtensionScope<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

#### Properties

| Name        | Type                             | Description                                                            |
| ----------- | -------------------------------- | ---------------------------------------------------------------------- |
| apiVersion  | `string`                         | The API version to use for this operation.                             |
| resourceUri | `string`                         | The fully qualified Azure Resource manager identifier of the resource. |
| provider    | `"Microsoft.ThisWillBeReplaced"` | The provider namespace for the resource.                               |

### `LocationBaseParameters` {#Azure.ResourceManager.Foundations.LocationBaseParameters}

The static parameters for a location-based resource

```typespec
model Azure.ResourceManager.Foundations.LocationBaseParameters
```

#### Properties

| Name           | Type     | Description                                |
| -------------- | -------- | ------------------------------------------ |
| apiVersion     | `string` | The API version to use for this operation. |
| subscriptionId | `string` | The ID of the target subscription.         |
| location       | `string` | The location name.                         |

### `LocationScope` {#Azure.ResourceManager.Foundations.LocationScope}

Parameter model for listing a resource at the location scope

```typespec
model Azure.ResourceManager.Foundations.LocationScope<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

#### Properties

| Name           | Type                             | Description                                |
| -------------- | -------------------------------- | ------------------------------------------ |
| apiVersion     | `string`                         | The API version to use for this operation. |
| subscriptionId | `string`                         | The ID of the target subscription.         |
| location       | `string`                         | The location name.                         |
| provider       | `"Microsoft.ThisWillBeReplaced"` | The provider namespace for the resource.   |

### `ManagedServiceIdentity` {#Azure.ResourceManager.Foundations.ManagedServiceIdentity}

The properties of the managed service identities assigned to this resource.

```typespec
model Azure.ResourceManager.Foundations.ManagedServiceIdentity
```

#### Properties

| Name                    | Type                                                                                                         | Description                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| tenantId?               | `string`                                                                                                     | The Active Directory tenant id of the principal.        |
| principalId?            | `string`                                                                                                     | The active directory identifier of this principal.      |
| type                    | [`ManagedServiceIdentityType`](./data-types.md#Azure.ResourceManager.Foundations.ManagedServiceIdentityType) | The type of managed identity assigned to this resource. |
| userAssignedIdentities? | `Record<ResourceManager.Foundations.UserAssignedIdentity>`                                                   | The identities assigned to this resource by the user.   |

### `Operation` {#Azure.ResourceManager.Foundations.Operation}

Details of a REST API operation, returned from the Resource Provider Operations API

```typespec
model Azure.ResourceManager.Foundations.Operation
```

#### Properties

| Name          | Type                                                                                     | Description                                                                                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name?         | `string`                                                                                 | The name of the operation, as per Resource-Based Access Control (RBAC). Examples: "Microsoft.Compute/virtualMachines/write", "Microsoft.Compute/virtualMachines/capture/action" |
| isDataAction? | `boolean`                                                                                | Whether the operation applies to data-plane. This is "true" for data-plane operations and "false" for Azure Resource Manager/control-plane operations.                          |
| display?      | [`OperationDisplay`](./data-types.md#Azure.ResourceManager.Foundations.OperationDisplay) | Localized display information for this particular operation.                                                                                                                    |
| origin?       | [`Origin`](./data-types.md#Azure.ResourceManager.Foundations.Origin)                     | The intended executor of the operation; as in Resource Based Access Control (RBAC) and audit logs UX. Default value is "user,system"                                            |
| actionType?   | [`ActionType`](./data-types.md#Azure.ResourceManager.Foundations.ActionType)             | Extensible enum. Indicates the action type. "Internal" refers to actions that are for internal only APIs.                                                                       |

### `OperationDisplay` {#Azure.ResourceManager.Foundations.OperationDisplay}

Localized display information for and operation.

```typespec
model Azure.ResourceManager.Foundations.OperationDisplay
```

#### Properties

| Name         | Type     | Description                                                                                                                                         |
| ------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| provider?    | `string` | The localized friendly form of the resource provider name, e.g. "Microsoft Monitoring Insights" or "Microsoft Compute".                             |
| resource?    | `string` | The localized friendly name of the resource type related to this operation. E.g. "Virtual Machines" or "Job Schedule Collections".                  |
| operation?   | `string` | The concise, localized friendly name for the operation; suitable for dropdowns. E.g. "Create or Update Virtual Machine", "Restart Virtual Machine". |
| description? | `string` | The short, localized friendly description of the operation; suitable for tool tips and detailed views.                                              |

### `OperationIdParameter` {#Azure.ResourceManager.Foundations.OperationIdParameter}

The default operationId parameter type.

```typespec
model Azure.ResourceManager.Foundations.OperationIdParameter
```

#### Properties

| Name        | Type     | Description                           |
| ----------- | -------- | ------------------------------------- |
| operationId | `string` | The ID of an ongoing async operation. |

### `OperationListResult` {#Azure.ResourceManager.Foundations.OperationListResult}

A list of REST API operations supported by an Azure Resource Provider. It contains an URL link to get the next set of results.

```typespec
model Azure.ResourceManager.Foundations.OperationListResult
```

#### Properties

| Name      | Type                                      | Description                        |
| --------- | ----------------------------------------- | ---------------------------------- |
| value     | `ResourceManager.Foundations.Operation[]` | The Operation items on this page   |
| nextLink? | `TypeSpec.Rest.ResourceLocation`          | The link to the next page of items |

### `OperationStatusResult` {#Azure.ResourceManager.Foundations.OperationStatusResult}

The current status of an async operation.

```typespec
model Azure.ResourceManager.Foundations.OperationStatusResult
```

#### Properties

| Name             | Type                                                                           | Description                                 |
| ---------------- | ------------------------------------------------------------------------------ | ------------------------------------------- |
| id?              | `string`                                                                       | Fully qualified ID for the async operation. |
| name?            | `string`                                                                       | Name of the async operation.                |
| status           | `string`                                                                       | Operation status.                           |
| percentComplete? | `int32`                                                                        | Percent of the operation that is complete.  |
| startTime?       | `utcDateTime`                                                                  | The start time of the operation.            |
| endTime?         | `utcDateTime`                                                                  | The end time of the operation.              |
| operations       | `ResourceManager.Foundations.OperationStatusResult[]`                          | The operations list.                        |
| error?           | [`ErrorDetail`](./data-types.md#Azure.ResourceManager.Foundations.ErrorDetail) | If present, details of the operation error. |

### `Plan` {#Azure.ResourceManager.Foundations.Plan}

Details of the resource plan.

```typespec
model Azure.ResourceManager.Foundations.Plan
```

#### Properties

| Name           | Type     | Description                                                                                                                                                 |
| -------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name           | `string` | A user defined name of the 3rd Party Artifact that is being procured.                                                                                       |
| publisher      | `string` | The publisher of the 3rd Party Artifact that is being bought. E.g. NewRelic                                                                                 |
| product        | `string` | The 3rd Party artifact that is being procured. E.g. NewRelic. Product maps to the OfferID specified for the artifact at the time of Data Market onboarding. |
| promotionCode? | `string` | A publisher provided promotion code as provisioned in Data Market for the said product/artifact.                                                            |
| version?       | `string` | The version of the desired product/artifact.                                                                                                                |

### `ProxyResource` {#Azure.ResourceManager.Foundations.ProxyResource}

The base proxy resource.

```typespec
model Azure.ResourceManager.Foundations.ProxyResource
```

#### Properties

None

### `ProxyResourceUpdateModel` {#Azure.ResourceManager.Foundations.ProxyResourceUpdateModel}

The type used for update operations of the resource.

```typespec
model Azure.ResourceManager.Foundations.ProxyResourceUpdateModel<Resource, Properties>
```

#### Template Parameters

| Name       | Description                 |
| ---------- | --------------------------- |
| Resource   | The type of the resource.   |
| Properties | The type of the properties. |

#### Properties

| Name        | Type                                                                              | Description |
| ----------- | --------------------------------------------------------------------------------- | ----------- |
| properties? | `ResourceManager.Foundations.ResourceUpdateModelProperties<Resource, Properties>` |             |

### `Resource` {#Azure.ResourceManager.Foundations.Resource}

Base model that defines common properties for all Azure Resource Manager resources.

```typespec
model Azure.ResourceManager.Foundations.Resource
```

#### Properties

| Name        | Type                                                                         | Description                                                                                                                                                                               |
| ----------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id?         | `string`                                                                     | Fully qualified resource ID for the resource. Ex - /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{resourceProviderNamespace}/{resourceType}/{resourceName} |
| name?       | `string`                                                                     | The name of the resource                                                                                                                                                                  |
| type?       | `string`                                                                     | The type of the resource. E.g. "Microsoft.Compute/virtualMachines" or "Microsoft.Storage/storageAccounts"                                                                                 |
| systemData? | [`SystemData`](./data-types.md#Azure.ResourceManager.Foundations.SystemData) | Azure Resource Manager metadata containing createdBy and modifiedBy information.                                                                                                          |

### `ResourceGroupBaseParameters` {#Azure.ResourceManager.Foundations.ResourceGroupBaseParameters}

The static parameters for a resource-group based resource

```typespec
model Azure.ResourceManager.Foundations.ResourceGroupBaseParameters
```

#### Properties

| Name              | Type     | Description                                                   |
| ----------------- | -------- | ------------------------------------------------------------- |
| apiVersion        | `string` | The API version to use for this operation.                    |
| subscriptionId    | `string` | The ID of the target subscription.                            |
| resourceGroupName | `string` | The name of the resource group. The name is case insensitive. |

### `ResourceGroupScope` {#Azure.ResourceManager.Foundations.ResourceGroupScope}

Parameter model for listing a resource at the resource group scope

```typespec
model Azure.ResourceManager.Foundations.ResourceGroupScope<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

#### Properties

| Name              | Type                             | Description                                                            |
| ----------------- | -------------------------------- | ---------------------------------------------------------------------- |
| apiVersion        | `string`                         | The API version to use for this operation.                             |
| subscriptionId    | `string`                         | The ID of the target subscription.                                     |
| location          | `string`                         | The location name.                                                     |
| resourceGroupName | `string`                         | The name of the resource group. The name is case insensitive.          |
| resourceUri       | `string`                         | The fully qualified Azure Resource manager identifier of the resource. |
| provider          | `"Microsoft.ThisWillBeReplaced"` | The provider namespace for the resource.                               |

### `ResourceUpdateModel` {#Azure.ResourceManager.Foundations.ResourceUpdateModel}

Defines a model type used to create named resource update models
e.g. `model MyResourceUpdate is ResourceUpdate<MyResourceProperties> {}`

```typespec
model Azure.ResourceManager.Foundations.ResourceUpdateModel<Resource, Properties>
```

#### Template Parameters

| Name       | Description                 |
| ---------- | --------------------------- |
| Resource   | The type of the resource.   |
| Properties | The type of the properties. |

#### Properties

| Name        | Type                                                                              | Description |
| ----------- | --------------------------------------------------------------------------------- | ----------- |
| properties? | `ResourceManager.Foundations.ResourceUpdateModelProperties<Resource, Properties>` |             |

### `ResourceUpdateModelProperties` {#Azure.ResourceManager.Foundations.ResourceUpdateModelProperties}

Defines a properties type used to create named resource update models.
This type is not used directly, it is referenced by ResourceUpdateModel.

```typespec
model Azure.ResourceManager.Foundations.ResourceUpdateModelProperties<Resource, Properties>
```

#### Template Parameters

| Name       | Description                 |
| ---------- | --------------------------- |
| Resource   | The type of the resource.   |
| Properties | The type of the properties. |

#### Properties

None

### `Sku` {#Azure.ResourceManager.Foundations.Sku}

The SKU (Stock Keeping Unit) assigned to this resource.

```typespec
model Azure.ResourceManager.Foundations.Sku
```

#### Properties

| Name      | Type                                                                   | Description                                                                                                                                          |
| --------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| name      | `string`                                                               | The name of the SKU, usually a combination of letters and numbers, for example, 'P3'                                                                 |
| tier?     | [`SkuTier`](./data-types.md#Azure.ResourceManager.Foundations.SkuTier) | This field is required to be implemented by the Resource Provider if the service has more than one tier, but is not required on a PUT.               |
| size?     | `string`                                                               | The SKU size. When the name field is the combination of tier and some other value, this would be the standalone code.                                |
| family?   | `string`                                                               | If the service has different generations of hardware, for the same SKU, then that can be captured here.                                              |
| capacity? | `int32`                                                                | If the SKU supports scale out/in then the capacity integer should be included. If scale out/in is not possible for the resource this may be omitted. |

### `SubscriptionBaseParameters` {#Azure.ResourceManager.Foundations.SubscriptionBaseParameters}

The static parameters for a subscription based resource

```typespec
model Azure.ResourceManager.Foundations.SubscriptionBaseParameters
```

#### Properties

| Name           | Type     | Description                                |
| -------------- | -------- | ------------------------------------------ |
| apiVersion     | `string` | The API version to use for this operation. |
| subscriptionId | `string` | The ID of the target subscription.         |

### `SubscriptionScope` {#Azure.ResourceManager.Foundations.SubscriptionScope}

Parameter model for listing a resource at the subscription scope

```typespec
model Azure.ResourceManager.Foundations.SubscriptionScope<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

#### Properties

| Name           | Type                             | Description                                |
| -------------- | -------------------------------- | ------------------------------------------ |
| apiVersion     | `string`                         | The API version to use for this operation. |
| subscriptionId | `string`                         | The ID of the target subscription.         |
| provider       | `"Microsoft.ThisWillBeReplaced"` | The provider namespace for the resource.   |

### `SystemAssignedServiceIdentity` {#Azure.ResourceManager.Foundations.SystemAssignedServiceIdentity}

The properties of the service-assigned identity associated with this resource.

```typespec
model Azure.ResourceManager.Foundations.SystemAssignedServiceIdentity
```

#### Properties

| Name         | Type                                                                                                                       | Description                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| tenantId?    | `string`                                                                                                                   | The Active Directory tenant id of the principal.        |
| principalId? | `string`                                                                                                                   | The active directory identifier of this principal.      |
| type         | [`SystemAssignedServiceIdentityType`](./data-types.md#Azure.ResourceManager.Foundations.SystemAssignedServiceIdentityType) | The type of managed identity assigned to this resource. |

### `SystemData` {#Azure.ResourceManager.Foundations.SystemData}

Metadata pertaining to creation and last modification of the resource.

```typespec
model Azure.ResourceManager.Foundations.SystemData
```

#### Properties

| Name                | Type                                                                               | Description                                           |
| ------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------- |
| createdBy?          | `string`                                                                           | The identity that created the resource.               |
| createdByType?      | [`createdByType`](./data-types.md#Azure.ResourceManager.Foundations.createdByType) | The type of identity that created the resource.       |
| createdAt?          | `plainDate`                                                                        | The type of identity that created the resource.       |
| lastModifiedBy?     | `string`                                                                           | The identity that last modified the resource.         |
| lastModifiedByType? | [`createdByType`](./data-types.md#Azure.ResourceManager.Foundations.createdByType) | The type of identity that last modified the resource. |
| lastModifiedAt?     | `plainDate`                                                                        | The timestamp of resource last modification (UTC)     |

### `TagsUpdateModel` {#Azure.ResourceManager.Foundations.TagsUpdateModel}

The type used for updating tags in resources.

```typespec
model Azure.ResourceManager.Foundations.TagsUpdateModel<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

#### Properties

| Name  | Type             | Description    |
| ----- | ---------------- | -------------- |
| tags? | `Record<string>` | Resource tags. |

### `TenantBaseParameters` {#Azure.ResourceManager.Foundations.TenantBaseParameters}

The static parameters for a tenant-based resource

```typespec
model Azure.ResourceManager.Foundations.TenantBaseParameters
```

#### Properties

| Name       | Type     | Description                                |
| ---------- | -------- | ------------------------------------------ |
| apiVersion | `string` | The API version to use for this operation. |

### `TenantScope` {#Azure.ResourceManager.Foundations.TenantScope}

Parameter model for listing a resource at the tenant scope

```typespec
model Azure.ResourceManager.Foundations.TenantScope<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

#### Properties

| Name       | Type                             | Description                                |
| ---------- | -------------------------------- | ------------------------------------------ |
| apiVersion | `string`                         | The API version to use for this operation. |
| provider   | `"Microsoft.ThisWillBeReplaced"` | The provider namespace for the resource.   |

### `TrackedResource` {#Azure.ResourceManager.Foundations.TrackedResource}

The base tracked resource.

```typespec
model Azure.ResourceManager.Foundations.TrackedResource
```

#### Properties

| Name     | Type             | Description                               |
| -------- | ---------------- | ----------------------------------------- |
| location | `string`         | The geo-location where the resource lives |
| tags?    | `Record<string>` | Resource tags.                            |

### `UserAssignedIdentities` {#Azure.ResourceManager.Foundations.UserAssignedIdentities}

The set of user assigned identities associated with the resource. The userAssignedIdentities dictionary keys will be ARM resource ids in the form: '/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/{identityName}. The dictionary values can be empty objects ({}) in requests.",

```typespec
model Azure.ResourceManager.Foundations.UserAssignedIdentities
```

#### Properties

| Name | Type                                                                                             | Description           |
| ---- | ------------------------------------------------------------------------------------------------ | --------------------- |
|      | [`UserAssignedIdentity`](./data-types.md#Azure.ResourceManager.Foundations.UserAssignedIdentity) | Additional properties |

### `UserAssignedIdentity` {#Azure.ResourceManager.Foundations.UserAssignedIdentity}

A managed identity assigned by the user.

```typespec
model Azure.ResourceManager.Foundations.UserAssignedIdentity
```

#### Properties

| Name         | Type     | Description                                                |
| ------------ | -------- | ---------------------------------------------------------- |
| clientId?    | `string` | The active directory client identifier for this principal. |
| principalId? | `string` | The active directory identifier for this principal.        |

### `ResourceHome` {#Azure.ResourceManager.Foundations.ResourceHome}

An internal enum to indicate the resource support for various path types

```typespec
enum Azure.ResourceManager.Foundations.ResourceHome
```

### `SkuTier` {#Azure.ResourceManager.Foundations.SkuTier}

Available service tiers for the SKU.

```typespec
enum Azure.ResourceManager.Foundations.SkuTier
```

### `ActionType` {#Azure.ResourceManager.Foundations.ActionType}

Extensible enum. Indicates the action type. "Internal" refers to actions that are for internal only APIs.

```typespec
union Azure.ResourceManager.Foundations.ActionType
```

### `CheckNameAvailabilityReason` {#Azure.ResourceManager.Foundations.CheckNameAvailabilityReason}

Possible reasons for a name not being available.

```typespec
union Azure.ResourceManager.Foundations.CheckNameAvailabilityReason
```

### `createdByType` {#Azure.ResourceManager.Foundations.createdByType}

The kind of entity that created the resource.

```typespec
union Azure.ResourceManager.Foundations.createdByType
```

### `ExtendedLocationType` {#Azure.ResourceManager.Foundations.ExtendedLocationType}

The supported ExtendedLocation types.

```typespec
union Azure.ResourceManager.Foundations.ExtendedLocationType
```

### `ManagedServiceIdentityType` {#Azure.ResourceManager.Foundations.ManagedServiceIdentityType}

The kind of managed identity assigned to this resource.

```typespec
union Azure.ResourceManager.Foundations.ManagedServiceIdentityType
```

### `Origin` {#Azure.ResourceManager.Foundations.Origin}

The intended executor of the operation; as in Resource Based Access Control (RBAC) and audit logs UX. Default value is "user,system"

```typespec
union Azure.ResourceManager.Foundations.Origin
```

### `SystemAssignedServiceIdentityType` {#Azure.ResourceManager.Foundations.SystemAssignedServiceIdentityType}

The kind of managemed identity assigned to this resource.

```typespec
union Azure.ResourceManager.Foundations.SystemAssignedServiceIdentityType
```
