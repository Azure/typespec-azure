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

### `ArmAcceptedLroResponse` {#Azure.ResourceManager.ArmAcceptedLroResponse}

```typespec
model Azure.ResourceManager.ArmAcceptedLroResponse<Description, LroHeaders>
```

#### Template Parameters

| Name        | Description                                                                        |
| ----------- | ---------------------------------------------------------------------------------- |
| Description | The description of the response status (defaults to `Resource operation accepted`) |
| LroHeaders  | Optional. The lro headers that appear in the Accepted response                     |

### `ArmAcceptedResponse` {#Azure.ResourceManager.ArmAcceptedResponse}

```typespec
model Azure.ResourceManager.ArmAcceptedResponse<Message>
```

#### Template Parameters

| Name    | Description                                                                        |
| ------- | ---------------------------------------------------------------------------------- |
| Message | The description of the response status (defaults to `Resource operation accepted`) |

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

### `ArmCreatedResponse` {#Azure.ResourceManager.ArmCreatedResponse}

The ARM 201 response for a resource

```typespec
model Azure.ResourceManager.ArmCreatedResponse<Type>
```

#### Template Parameters

| Name | Description                       |
| ---- | --------------------------------- |
| Type | The contents of the response body |

### `ArmDeleteAcceptedLroResponse` {#Azure.ResourceManager.ArmDeleteAcceptedLroResponse}

```typespec
model Azure.ResourceManager.ArmDeleteAcceptedLroResponse<LroHeaders>
```

#### Template Parameters

| Name       | Description                                                           |
| ---------- | --------------------------------------------------------------------- |
| LroHeaders | Optional. Allows overriding the Lro headers returned in the response. |

### `ArmDeleteAcceptedResponse` {#Azure.ResourceManager.ArmDeleteAcceptedResponse}

```typespec
model Azure.ResourceManager.ArmDeleteAcceptedResponse
```

### `ArmDeletedNoContentResponse` {#Azure.ResourceManager.ArmDeletedNoContentResponse}

```typespec
model Azure.ResourceManager.ArmDeletedNoContentResponse
```

### `ArmDeletedResponse` {#Azure.ResourceManager.ArmDeletedResponse}

The response for synchronous delete of a resource

```typespec
model Azure.ResourceManager.ArmDeletedResponse
```

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

### `ArmNoContentResponse` {#Azure.ResourceManager.ArmNoContentResponse}

Standard ARM NoContent (204) response

```typespec
model Azure.ResourceManager.ArmNoContentResponse<Message>
```

#### Template Parameters

| Name    | Description                                                                             |
| ------- | --------------------------------------------------------------------------------------- |
| Message | The description of the response status (defaults to `Operation completed successfully`) |

### `ArmOperationStatus` {#Azure.ResourceManager.ArmOperationStatus}

Standard ARM operation status response

```typespec
model Azure.ResourceManager.ArmOperationStatus<Properties, StatusValues>
```

#### Template Parameters

| Name         | Description                                    |
| ------------ | ---------------------------------------------- |
| Properties   | Optional resource-specific properties          |
| StatusValues | The set of allowed values for operation status |

### `ArmResourceCreatedResponse` {#Azure.ResourceManager.ArmResourceCreatedResponse}

```typespec
model Azure.ResourceManager.ArmResourceCreatedResponse<Resource, LroHeaders>
```

#### Template Parameters

| Name       | Description                                                |
| ---------- | ---------------------------------------------------------- |
| Resource   | The resource being updated                                 |
| LroHeaders | Optional. The lro headers returned with a Created response |

### `ArmResourceCreatedSyncResponse` {#Azure.ResourceManager.ArmResourceCreatedSyncResponse}

```typespec
model Azure.ResourceManager.ArmResourceCreatedSyncResponse<Resource>
```

#### Template Parameters

| Name     | Description                |
| -------- | -------------------------- |
| Resource | The resource being updated |

### `ArmResourceUpdatedResponse` {#Azure.ResourceManager.ArmResourceUpdatedResponse}

```typespec
model Azure.ResourceManager.ArmResourceUpdatedResponse<Resource>
```

#### Template Parameters

| Name     | Description                |
| -------- | -------------------------- |
| Resource | The resource being updated |

### `ArmResponse` {#Azure.ResourceManager.ArmResponse}

The ARM synchronous OK response

```typespec
model Azure.ResourceManager.ArmResponse<Type>
```

#### Template Parameters

| Name | Description                       |
| ---- | --------------------------------- |
| Type | The contents of the response body |

### `CustomerManagedKeyEncryption` {#Azure.ResourceManager.CustomerManagedKeyEncryption}

Customer-managed key encryption properties for the resource.

```typespec
model Azure.ResourceManager.CustomerManagedKeyEncryption
```

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

### `EncryptionConfiguration` {#Azure.ResourceManager.EncryptionConfiguration}

All encryption configuration for a resource.

```typespec
model Azure.ResourceManager.EncryptionConfiguration
```

### `EntityTag` {#Azure.ResourceManager.EntityTag}

Model used only to spread in the standard `eTag` envelope property for a resource

```typespec
model Azure.ResourceManager.EntityTag
```

#### Examples

```typespec
model Foo is TrackedResource<FooProperties> {
  // Only have standard Succeeded, Failed, Cancelled states
  ...EntityTag;
}
```

### `ErrorResponse` {#Azure.ResourceManager.ErrorResponse}

The standard ARM error response

```typespec
model Azure.ResourceManager.ErrorResponse
```

### `ExtensionResource` {#Azure.ResourceManager.ExtensionResource}

Concrete extension resource types can be created by aliasing this type using a specific property type.

See more details on [different ARM resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)

```typespec
model Azure.ResourceManager.ExtensionResource<Properties>
```

#### Template Parameters

| Name       | Description                                                           |
| ---------- | --------------------------------------------------------------------- |
| Properties | A model containing the provider-specific properties for this resource |

### `KeysOf` {#Azure.ResourceManager.KeysOf}

Extracts the key (path) parameters from a resource and its parents

```typespec
model Azure.ResourceManager.KeysOf<Resource>
```

#### Template Parameters

| Name     | Description                             |
| -------- | --------------------------------------- |
| Resource | The resource to extract properties from |

### `LocationParameter` {#Azure.ResourceManager.LocationParameter}

DEPRECATED - DO NOT USE
The default location parameter type.

```typespec
model Azure.ResourceManager.LocationParameter
```

### `LocationResourceParameter` {#Azure.ResourceManager.LocationResourceParameter}

The default location parameter type.

```typespec
model Azure.ResourceManager.LocationResourceParameter
```

### `ManagedBy` {#Azure.ResourceManager.ManagedBy}

Model used only to spread in the standard `managedBy` envelope property for a resource

```typespec
model Azure.ResourceManager.ManagedBy
```

#### Examples

```typespec
model Foo is TrackedResource<FooProperties> {
  // Only have standard Succeeded, Failed, Cancelled states
  ...ManagedBy;
}
```

### `ManagedServiceIdentity` {#Azure.ResourceManager.ManagedServiceIdentity}

Standard ARM definition of ManagedServiceIdentity

```typespec
model Azure.ResourceManager.ManagedServiceIdentity
```

### `ManagedSystemAssignedIdentity` {#Azure.ResourceManager.ManagedSystemAssignedIdentity}

Standard ARM definition of ManagedServiceIdentity for services
that only support system-defined identities

```typespec
model Azure.ResourceManager.ManagedSystemAssignedIdentity
```

### `ParentKeysOf` {#Azure.ResourceManager.ParentKeysOf}

Extracts the key (path) parameters from the parent(s) of the given resource

```typespec
model Azure.ResourceManager.ParentKeysOf<Resource>
```

#### Template Parameters

| Name     | Description                             |
| -------- | --------------------------------------- |
| Resource | The resource to extract properties from |

### `PrivateEndpoint` {#Azure.ResourceManager.PrivateEndpoint}

The private endpoint resource

```typespec
model Azure.ResourceManager.PrivateEndpoint
```

### `PrivateEndpointConnection` {#Azure.ResourceManager.PrivateEndpointConnection}

The private endpoint connection resource

```typespec
model Azure.ResourceManager.PrivateEndpointConnection
```

### `PrivateEndpointConnectionParameter` {#Azure.ResourceManager.PrivateEndpointConnectionParameter}

The name of the private endpoint connection associated with the Azure resource.

```typespec
model Azure.ResourceManager.PrivateEndpointConnectionParameter<Segment>
```

#### Template Parameters

| Name    | Description                                                                                     |
| ------- | ----------------------------------------------------------------------------------------------- |
| Segment | The resource type name for private endpoint connections (default is privateEndpointConnections) |

### `PrivateEndpointConnectionProperties` {#Azure.ResourceManager.PrivateEndpointConnectionProperties}

Properties of he private endpoint connection resource

```typespec
model Azure.ResourceManager.PrivateEndpointConnectionProperties
```

### `PrivateEndpointConnectionResourceListResult` {#Azure.ResourceManager.PrivateEndpointConnectionResourceListResult}

List of private endpoint connections associated with the specified resource.

```typespec
model Azure.ResourceManager.PrivateEndpointConnectionResourceListResult
```

### `PrivateLinkResource` {#Azure.ResourceManager.PrivateLinkResource}

```typespec
model Azure.ResourceManager.PrivateLinkResource
```

### `PrivateLinkResourceListResult` {#Azure.ResourceManager.PrivateLinkResourceListResult}

A list of private link resources.

```typespec
model Azure.ResourceManager.PrivateLinkResourceListResult
```

### `PrivateLinkResourceParameter` {#Azure.ResourceManager.PrivateLinkResourceParameter}

The name of the private link associated with the Azure resource.

```typespec
model Azure.ResourceManager.PrivateLinkResourceParameter<Segment>
```

#### Template Parameters

| Name    | Description                                                                |
| ------- | -------------------------------------------------------------------------- |
| Segment | The resource type name for private links (default is privateLinkResources) |

### `PrivateLinkResourceProperties` {#Azure.ResourceManager.PrivateLinkResourceProperties}

Properties of a private link resource.

```typespec
model Azure.ResourceManager.PrivateLinkResourceProperties
```

### `PrivateLinkServiceConnectionState` {#Azure.ResourceManager.PrivateLinkServiceConnectionState}

A collection of information about the state of the connection between service consumer and provider.

```typespec
model Azure.ResourceManager.PrivateLinkServiceConnectionState
```

### `ProviderNamespace` {#Azure.ResourceManager.ProviderNamespace}

Model describing the provider namespace.

```typespec
model Azure.ResourceManager.ProviderNamespace<Resource>
```

#### Template Parameters

| Name     | Description                             |
| -------- | --------------------------------------- |
| Resource | The resource provided by the namespace. |

### `ProxyResource` {#Azure.ResourceManager.ProxyResource}

Concrete proxy resource types can be created by aliasing this type using a specific property type.

See more details on [different ARM resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)

```typespec
model Azure.ResourceManager.ProxyResource<Properties>
```

#### Template Parameters

| Name       | Description                                                           |
| ---------- | --------------------------------------------------------------------- |
| Properties | A model containing the provider-specific properties for this resource |

### `ResourceGroupParameter` {#Azure.ResourceManager.ResourceGroupParameter}

The default resource group parameter type.

```typespec
model Azure.ResourceManager.ResourceGroupParameter
```

### `ResourceIdentifierAllowedResource` {#Azure.ResourceManager.ResourceIdentifierAllowedResource}

Used in ResourceIdentifier definition to represent a particular type of ARM resource, enabling constraints based on resource type.
See [link](https://github.com/Azure/autorest/tree/main/docs/extensions#schema)

```typespec
model Azure.ResourceManager.ResourceIdentifierAllowedResource
```

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

### `ResourceKind` {#Azure.ResourceManager.ResourceKind}

Model used only to spread in the standard `kind` envelope property for a resource

```typespec
model Azure.ResourceManager.ResourceKind
```

#### Examples

```typespec
model Foo is TrackedResource<FooProperties> {
  // Only have standard Succeeded, Failed, Cancelled states
  ...ResourceKind;
}
```

### `ResourceListResult` {#Azure.ResourceManager.ResourceListResult}

Paged response containing resources

```typespec
model Azure.ResourceManager.ResourceListResult<Resource>
```

#### Template Parameters

| Name     | Description                                                                |
| -------- | -------------------------------------------------------------------------- |
| Resource | The type of the values returned in the paged response (must be a resource) |

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

### `ResourcePlan` {#Azure.ResourceManager.ResourcePlan}

Model used only to spread in the standard `plan` envelope property for a resource

```typespec
model Azure.ResourceManager.ResourcePlan
```

#### Examples

```typespec
model Foo is TrackedResource<FooProperties> {
  // Only have standard Succeeded, Failed, Cancelled states
  ...ResourcePlan;
}
```

### `ResourceSku` {#Azure.ResourceManager.ResourceSku}

Model used only to spread in the standard `sku` envelope property for a resource

```typespec
model Azure.ResourceManager.ResourceSku
```

#### Examples

```typespec
model Foo is TrackedResource<FooProperties> {
  // Only have standard Succeeded, Failed, Cancelled states
  ...ResourceSku;
}
```

### `ResourceUriParameter` {#Azure.ResourceManager.ResourceUriParameter}

The default resourceUri parameter type.

```typespec
model Azure.ResourceManager.ResourceUriParameter
```

### `SubscriptionIdParameter` {#Azure.ResourceManager.SubscriptionIdParameter}

The default subscriptionId parameter type.

```typespec
model Azure.ResourceManager.SubscriptionIdParameter
```

### `SubscriptionLocationResource` {#Azure.ResourceManager.SubscriptionLocationResource}

```typespec
model Azure.ResourceManager.SubscriptionLocationResource
```

### `TenantLocationResource` {#Azure.ResourceManager.TenantLocationResource}

```typespec
model Azure.ResourceManager.TenantLocationResource
```

### `TrackedResource` {#Azure.ResourceManager.TrackedResource}

Concrete tracked resource types can be created by aliasing this type using a specific property type.

See more details on [different ARM resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)

```typespec
model Azure.ResourceManager.TrackedResource<Properties>
```

#### Template Parameters

| Name       | Description                                                           |
| ---------- | --------------------------------------------------------------------- |
| Properties | A model containing the provider-specific properties for this resource |

### `InfrastructureEncryption` {#Azure.ResourceManager.InfrastructureEncryption}

(Optional) Discouraged to include in resource definition. Only needed where it is possible to disable platform (AKA infrastructure) encryption. Azure SQL TDE is an example of this. Values are enabled and disabled.

```typespec
enum Azure.ResourceManager.InfrastructureEncryption
```

### `KeyEncryptionIdentity` {#Azure.ResourceManager.KeyEncryptionIdentity}

The type of identity to use.

```typespec
enum Azure.ResourceManager.KeyEncryptionIdentity
```

### `PrivateEndpointConnectionProvisioningState` {#Azure.ResourceManager.PrivateEndpointConnectionProvisioningState}

The provisioning state of the connection

```typespec
enum Azure.ResourceManager.PrivateEndpointConnectionProvisioningState
```

### `PrivateEndpointServiceConnectionStatus` {#Azure.ResourceManager.PrivateEndpointServiceConnectionStatus}

The private endpoint connection status

```typespec
enum Azure.ResourceManager.PrivateEndpointServiceConnectionStatus
```

### `ResourceProvisioningState` {#Azure.ResourceManager.ResourceProvisioningState}

Standard terminal provisioning state of resource type. You can spread into your
custom provision state to avoid duplication and ensure consistency

```typespec
enum Azure.ResourceManager.ResourceProvisioningState
```

#### Examples

```typespec
enum FooProvisioningState {
  ...ResourceProvisioningState, // include standard provisioning states
  starting,
  started,
  stopping,
  stopped,
}
```

### `Versions` {#Azure.ResourceManager.Versions}

Supported versions of Azure.ResourceManager building blocks.

```typespec
enum Azure.ResourceManager.Versions
```

### `ResourceIdentifier` {#Azure.ResourceManager.ResourceIdentifier}

A type definition that refers the id to an ARM resource.

Sample usage:
otherArmId: ResourceIdentifier;
networkId: ResourceIdentifier<[{type:"\\Microsoft.Network\\vnet"}]>
vmIds: ResourceIdentifier<[{type:"\\Microsoft.Compute\\vm", scopes["*"]}]>

```typespec
scalar Azure.ResourceManager.ResourceIdentifier
```

### `ResourceIdentifier` {#Azure.ResourceManager.ResourceIdentifier}

A type definition that refers the id to an ARM resource.

Sample usage:
otherArmId: ResourceIdentifier;
networkId: ResourceIdentifier<[{type:"\\Microsoft.Network\\vnet"}]>
vmIds: ResourceIdentifier<[{type:"\\Microsoft.Compute\\vm", scopes["*"]}]>

```typespec
scalar Azure.ResourceManager.ResourceIdentifier
```

### `ResourceIdentifier` {#Azure.ResourceManager.ResourceIdentifier}

A type definition that refers the id to an ARM resource.

Sample usage:
otherArmId: ResourceIdentifier;
networkId: ResourceIdentifier<[{type:"\\Microsoft.Network\\vnet"}]>
vmIds: ResourceIdentifier<[{type:"\\Microsoft.Compute\\vm", scopes["*"]}]>

```typespec
scalar Azure.ResourceManager.ResourceIdentifier
```

## Azure.ResourceManager.CommonTypes

### `Versions` {#Azure.ResourceManager.CommonTypes.Versions}

The ARM common-types versions.

```typespec
enum Azure.ResourceManager.CommonTypes.Versions
```

## Azure.ResourceManager.Foundations

### `ArmResource` {#Azure.ResourceManager.Foundations.ArmResource}

Base model that defines common properties for all ARM resources.

```typespec
model Azure.ResourceManager.Foundations.ArmResource
```

### `ArmResourceBase` {#Azure.ResourceManager.Foundations.ArmResourceBase}

Base class used for type definitions

```typespec
model Azure.ResourceManager.Foundations.ArmResourceBase
```

### `ArmTagsProperty` {#Azure.ResourceManager.Foundations.ArmTagsProperty}

Standard type definition for ARM Tags property.

It is included in the TrackedResource template definition.

```typespec
model Azure.ResourceManager.Foundations.ArmTagsProperty
```

### `CheckNameAvailabilityRequest` {#Azure.ResourceManager.Foundations.CheckNameAvailabilityRequest}

The check availability request body.

```typespec
model Azure.ResourceManager.Foundations.CheckNameAvailabilityRequest
```

### `CheckNameAvailabilityResponse` {#Azure.ResourceManager.Foundations.CheckNameAvailabilityResponse}

The check availability result.

```typespec
model Azure.ResourceManager.Foundations.CheckNameAvailabilityResponse
```

### `DefaultBaseParameters` {#Azure.ResourceManager.Foundations.DefaultBaseParameters}

Base parameters for a resource.

```typespec
model Azure.ResourceManager.Foundations.DefaultBaseParameters<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

### `ErrorAdditionalInfo` {#Azure.ResourceManager.Foundations.ErrorAdditionalInfo}

The resource management error additional info.

```typespec
model Azure.ResourceManager.Foundations.ErrorAdditionalInfo
```

### `ErrorDetail` {#Azure.ResourceManager.Foundations.ErrorDetail}

The error detail.

```typespec
model Azure.ResourceManager.Foundations.ErrorDetail
```

### `ExtensionBaseParameters` {#Azure.ResourceManager.Foundations.ExtensionBaseParameters}

The static parameters for an extension resource

```typespec
model Azure.ResourceManager.Foundations.ExtensionBaseParameters
```

### `ExtensionResourceBase` {#Azure.ResourceManager.Foundations.ExtensionResourceBase}

The base extension resource.

```typespec
model Azure.ResourceManager.Foundations.ExtensionResourceBase
```

### `ExtensionScope` {#Azure.ResourceManager.Foundations.ExtensionScope}

Parameter model for listing an extension resource

```typespec
model Azure.ResourceManager.Foundations.ExtensionScope<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

### `LocationBaseParameters` {#Azure.ResourceManager.Foundations.LocationBaseParameters}

The static parameters for a location-based resource

```typespec
model Azure.ResourceManager.Foundations.LocationBaseParameters
```

### `LocationScope` {#Azure.ResourceManager.Foundations.LocationScope}

Parameter model for listing a resource at the location scope

```typespec
model Azure.ResourceManager.Foundations.LocationScope<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

### `ManagedIdentityProperties` {#Azure.ResourceManager.Foundations.ManagedIdentityProperties}

The properties of the managed service identities assigned to this resource.

```typespec
model Azure.ResourceManager.Foundations.ManagedIdentityProperties
```

### `ManagedSystemIdentityProperties` {#Azure.ResourceManager.Foundations.ManagedSystemIdentityProperties}

The properties of the service-assigned identity associated with this resource.

```typespec
model Azure.ResourceManager.Foundations.ManagedSystemIdentityProperties
```

### `Operation` {#Azure.ResourceManager.Foundations.Operation}

Details of a REST API operation, returned from the Resource Provider Operations API

```typespec
model Azure.ResourceManager.Foundations.Operation
```

### `OperationDisplay` {#Azure.ResourceManager.Foundations.OperationDisplay}

Localized display information for and operation.

```typespec
model Azure.ResourceManager.Foundations.OperationDisplay
```

### `OperationIdParameter` {#Azure.ResourceManager.Foundations.OperationIdParameter}

The default operationId parameter type.

```typespec
model Azure.ResourceManager.Foundations.OperationIdParameter
```

### `OperationListResult` {#Azure.ResourceManager.Foundations.OperationListResult}

A list of REST API operations supported by an Azure Resource Provider. It contains an URL link to get the next set of results.

```typespec
model Azure.ResourceManager.Foundations.OperationListResult
```

### `OperationStatusResult` {#Azure.ResourceManager.Foundations.OperationStatusResult}

The current status of an async operation.

```typespec
model Azure.ResourceManager.Foundations.OperationStatusResult
```

### `ProxyResourceBase` {#Azure.ResourceManager.Foundations.ProxyResourceBase}

The base proxy resource.

```typespec
model Azure.ResourceManager.Foundations.ProxyResourceBase
```

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

### `ResourceGroupBaseParameters` {#Azure.ResourceManager.Foundations.ResourceGroupBaseParameters}

The static parameters for a resource-group based resource

```typespec
model Azure.ResourceManager.Foundations.ResourceGroupBaseParameters
```

### `ResourceGroupScope` {#Azure.ResourceManager.Foundations.ResourceGroupScope}

Parameter model for listing a resource at the resource group scope

```typespec
model Azure.ResourceManager.Foundations.ResourceGroupScope<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

### `ResourcePlanType` {#Azure.ResourceManager.Foundations.ResourcePlanType}

Details of the resource plan.

```typespec
model Azure.ResourceManager.Foundations.ResourcePlanType
```

### `ResourceSkuType` {#Azure.ResourceManager.Foundations.ResourceSkuType}

The SKU (Stock Keeping Unit) assigned to this resource.

```typespec
model Azure.ResourceManager.Foundations.ResourceSkuType
```

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

### `SubscriptionBaseParameters` {#Azure.ResourceManager.Foundations.SubscriptionBaseParameters}

The static parameters for a subscription based resource

```typespec
model Azure.ResourceManager.Foundations.SubscriptionBaseParameters
```

### `SubscriptionScope` {#Azure.ResourceManager.Foundations.SubscriptionScope}

Parameter model for listing a resource at the subscription scope

```typespec
model Azure.ResourceManager.Foundations.SubscriptionScope<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

### `SystemData` {#Azure.ResourceManager.Foundations.SystemData}

Metadata pertaining to creation and last modification of the resource.

```typespec
model Azure.ResourceManager.Foundations.SystemData
```

### `TagsUpdateModel` {#Azure.ResourceManager.Foundations.TagsUpdateModel}

The type used for updating tags in resources.

```typespec
model Azure.ResourceManager.Foundations.TagsUpdateModel<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

### `TenantBaseParameters` {#Azure.ResourceManager.Foundations.TenantBaseParameters}

The static parameters for a tenant-based resource

```typespec
model Azure.ResourceManager.Foundations.TenantBaseParameters
```

### `TenantScope` {#Azure.ResourceManager.Foundations.TenantScope}

Parameter model for listing a resource at the tenant scope

```typespec
model Azure.ResourceManager.Foundations.TenantScope<Resource>
```

#### Template Parameters

| Name     | Description               |
| -------- | ------------------------- |
| Resource | The type of the resource. |

### `TrackedResourceBase` {#Azure.ResourceManager.Foundations.TrackedResourceBase}

The base tracked resource.

```typespec
model Azure.ResourceManager.Foundations.TrackedResourceBase
```

### `UserAssignedIdentity` {#Azure.ResourceManager.Foundations.UserAssignedIdentity}

A managed identity assigned by the user.

```typespec
model Azure.ResourceManager.Foundations.UserAssignedIdentity
```

### `ActionType` {#Azure.ResourceManager.Foundations.ActionType}

Enum. Indicates the action type. "Internal" refers to actions that are for internal only APIs.

```typespec
enum Azure.ResourceManager.Foundations.ActionType
```

### `CheckNameAvailabilityReason` {#Azure.ResourceManager.Foundations.CheckNameAvailabilityReason}

Possible reasons for a name not being available.

```typespec
enum Azure.ResourceManager.Foundations.CheckNameAvailabilityReason
```

### `createdByType` {#Azure.ResourceManager.Foundations.createdByType}

The kind of entity that created the resource.

```typespec
enum Azure.ResourceManager.Foundations.createdByType
```

### `ManagedIdentityType` {#Azure.ResourceManager.Foundations.ManagedIdentityType}

The kind of managed identity assigned to this resource.

```typespec
enum Azure.ResourceManager.Foundations.ManagedIdentityType
```

### `ManagedSystemIdentityType` {#Azure.ResourceManager.Foundations.ManagedSystemIdentityType}

The kind of managemed identity assigned to this resource.

```typespec
enum Azure.ResourceManager.Foundations.ManagedSystemIdentityType
```

### `Origin` {#Azure.ResourceManager.Foundations.Origin}

The intended executor of the operation; as in Resource Based Access Control (RBAC) and audit logs UX. Default value is "user,system"

```typespec
enum Azure.ResourceManager.Foundations.Origin
```

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
