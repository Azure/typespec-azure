---
title: "Data types"
---

## Azure.ResourceManager

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
model Azure.ResourceManager.ArmAsyncOperationHeader<StatusMonitor, UrlValue, FinalResult>
```

#### Template Parameters

| Name          | Description                                       |
| ------------- | ------------------------------------------------- |
| StatusMonitor | The status monitor type for lro polling           |
| UrlValue      | The value type of the Azure-AsyncOperation header |
| FinalResult   | The logical final result of the operation         |

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

| Name     | Type                 | Description                   |
| -------- | -------------------- | ----------------------------- |
| location | `Core.azureLocation` | The name of the Azure region. |

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
| error?           | [`ErrorDetail`](./data-types.md#Azure.ResourceManager.CommonTypes.ErrorDetail) | Errors that occurred if the operation ended with Canceled or Failed status                                       |

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

| Name       | Type       | Description      |
| ---------- | ---------- | ---------------- |
| statusCode | `200`      | The status code. |
| body       | `Resource` |                  |

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

### `AvailabilityZonesProperty` {#Azure.ResourceManager.AvailabilityZonesProperty}

Model representing the standard `zones` envelope property for a resource.
Spread this model into a resource Model if the resource supports ARM `zones`.

```typespec
model Azure.ResourceManager.AvailabilityZonesProperty
```

#### Examples

```typescript
model Foo is TrackedResource<FooProperties> {
  ...AvailabilityZonesProperty;
}
```

#### Properties

| Name   | Type       | Description             |
| ------ | ---------- | ----------------------- |
| zones? | `string[]` | The availability zones. |

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

### `EncryptionProperty` {#Azure.ResourceManager.EncryptionProperty}

Model used only to spread in the `encryption` envelope property for a resource.
All encryption configuration for a resource.

```typespec
model Azure.ResourceManager.EncryptionProperty
```

#### Examples

```typespec
model Foo is TrackedResource<FooProperties> {
  ...Encryption;
}
```

#### Properties

| Name       | Type                                                                         | Description                                  |
| ---------- | ---------------------------------------------------------------------------- | -------------------------------------------- |
| encryption | [`Encryption`](./data-types.md#Azure.ResourceManager.CommonTypes.Encryption) | All encryption configuration for a resource. |

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
| extendedLocation? | [`ExtendedLocation`](./data-types.md#Azure.ResourceManager.CommonTypes.ExtendedLocation) |             |

### `ExtensionResource` {#Azure.ResourceManager.ExtensionResource}

Concrete extension resource types can be created by aliasing this type using a specific property type.

See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)

```typespec
model Azure.ResourceManager.ExtensionResource<Properties, PropertiesOptional>
```

#### Template Parameters

| Name               | Description                                                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Properties         | A model containing the provider-specific properties for this resource                                                                          |
| PropertiesOptional | A boolean flag indicating whether the resource `Properties` field is marked as optional or required. Default true is optional and recommended. |

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
| identity? | [`ManagedServiceIdentity`](./data-types.md#Azure.ResourceManager.CommonTypes.ManagedServiceIdentity) | The managed service identities assigned to this resource. |

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
| identity? | [`SystemAssignedServiceIdentity`](./data-types.md#Azure.ResourceManager.CommonTypes.SystemAssignedServiceIdentity) | The managed service identities assigned to this resource. |

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
model Azure.ResourceManager.ProxyResource<Properties, PropertiesOptional>
```

#### Template Parameters

| Name               | Description                                                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Properties         | A model containing the provider-specific properties for this resource                                                                          |
| PropertiesOptional | A boolean flag indicating whether the resource `Properties` field is marked as optional or required. Default true is optional and recommended. |

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

| Name     | Type                 | Description                   |
| -------- | -------------------- | ----------------------------- |
| location | `Core.azureLocation` | The name of the Azure region. |

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

| Name      | Type                             | Description |
| --------- | -------------------------------- | ----------- |
| value     | `Array<Element>`                 |             |
| nextLink? | `TypeSpec.Rest.ResourceLocation` |             |

### `ResourceNameParameter` {#Azure.ResourceManager.ResourceNameParameter}

Spread this model into ARM resource models to specify resource name parameter for its operations. If `Resource` parameter
is specified, the resource name will be properly camel cased and pluralized for `@key` and `@segment`
automatically. You can also apply explicit override with `KeyName` and `SegmentName` template parameters.

For additional decorators such as

```typespec
model Azure.ResourceManager.ResourceNameParameter<Resource, KeyName, SegmentName, NamePattern, Type>
```

#### Template Parameters

| Name        | Description                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| Resource    | The ARM resource this name parameter is applying to.                                                     |
| KeyName     | Override default key name of the resource.                                                               |
| SegmentName | Override default segment name of the resource.                                                           |
| NamePattern | The RegEx pattern of the name. Default is `^[a-zA-Z0-9-]{3,24}$`.                                        |
| Type        | The type of the name property. Default type is string. However you can pass an union with string values. |

#### Properties

| Name | Type   | Description |
| ---- | ------ | ----------- |
| name | `Type` |             |

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
| plan? | [`Plan`](./data-types.md#Azure.ResourceManager.CommonTypes.Plan) | Details of the resource plan. |

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
| sku? | [`Sku`](./data-types.md#Azure.ResourceManager.CommonTypes.Sku) | The SKU (Stock Keeping Unit) assigned to this resource. |

### `ResourceUriParameter` {#Azure.ResourceManager.ResourceUriParameter}

The default resourceUri parameter type.

```typespec
model Azure.ResourceManager.ResourceUriParameter
```

#### Properties

| Name        | Type     | Description                                                            |
| ----------- | -------- | ---------------------------------------------------------------------- |
| resourceUri | `string` | The fully qualified Azure Resource manager identifier of the resource. |

### `SubscriptionActionScope` {#Azure.ResourceManager.SubscriptionActionScope}

Template used by ArmProviderAction templates.

```typespec
model Azure.ResourceManager.SubscriptionActionScope
```

#### Properties

| Name | Type     | Description            |
| ---- | -------- | ---------------------- |
| name | `string` | Symbolic name of scope |

### `SubscriptionLocationResource` {#Azure.ResourceManager.SubscriptionLocationResource}

The location resource for subscription-based locations. This can be used as a parent
resource for resource types that are homed in a subscription-based location.

```typespec
model Azure.ResourceManager.SubscriptionLocationResource
```

#### Properties

| Name     | Type                 | Description                   |
| -------- | -------------------- | ----------------------------- |
| location | `Core.azureLocation` | The name of the Azure region. |

### `TenantActionScope` {#Azure.ResourceManager.TenantActionScope}

Template used by ArmTenantAction templates.

```typespec
model Azure.ResourceManager.TenantActionScope
```

#### Properties

| Name | Type     | Description            |
| ---- | -------- | ---------------------- |
| name | `string` | Symbolic name of scope |

### `TenantLocationResource` {#Azure.ResourceManager.TenantLocationResource}

The location resource for tenant-based locations. This can be used as a parent
resource for resource types that are homed in a tenant-based location.

```typespec
model Azure.ResourceManager.TenantLocationResource
```

#### Properties

| Name     | Type                 | Description                   |
| -------- | -------------------- | ----------------------------- |
| location | `Core.azureLocation` | The name of the Azure region. |

### `TrackedResource` {#Azure.ResourceManager.TrackedResource}

Concrete tracked resource types can be created by aliasing this type using a specific property type.

See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)

```typespec
model Azure.ResourceManager.TrackedResource<Properties, PropertiesOptional>
```

#### Template Parameters

| Name               | Description                                                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Properties         | A model containing the provider-specific properties for this resource                                                                          |
| PropertiesOptional | A boolean flag indicating whether the resource `Properties` field is marked as optional or required. Default true is optional and recommended. |

#### Properties

| Name        | Type         | Description |
| ----------- | ------------ | ----------- |
| properties? | `Properties` |             |

### `Versions` {#Azure.ResourceManager.Versions}

Supported versions of Azure.ResourceManager building blocks.

```typespec
enum Azure.ResourceManager.Versions
```

| Name           | Value             | Description           |
| -------------- | ----------------- | --------------------- |
| v1_0_Preview_1 | `"1.0-preview.1"` | Version 1.0-preview.1 |

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

### `AccessRule` {#Azure.ResourceManager.CommonTypes.AccessRule}

Access rule in a network security perimeter configuration profile

```typespec
model Azure.ResourceManager.CommonTypes.AccessRule
```

#### Properties

| Name        | Type                                                                                             | Description             |
| ----------- | ------------------------------------------------------------------------------------------------ | ----------------------- |
| name?       | `string`                                                                                         | Name of the access rule |
| properties? | [`AccessRuleProperties`](./data-types.md#Azure.ResourceManager.CommonTypes.AccessRuleProperties) |                         |

### `AccessRuleProperties` {#Azure.ResourceManager.CommonTypes.AccessRuleProperties}

Properties of Access Rule

```typespec
model Azure.ResourceManager.CommonTypes.AccessRuleProperties
```

#### Properties

| Name                       | Type                                                                                           | Description                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| direction?                 | [`AccessRuleDirection`](./data-types.md#Azure.ResourceManager.CommonTypes.AccessRuleDirection) |                                                        |
| addressPrefixes?           | `string[]`                                                                                     | Address prefixes in the CIDR format for inbound rules  |
| subscriptions?             | `ResourceManager.CommonTypes.{ id: Core.armResourceIdentifier }[]`                             | Subscriptions for inbound rules                        |
| networkSecurityPerimeters? | `ResourceManager.CommonTypes.NetworkSecurityPerimeter[]`                                       | Network security perimeters for inbound rules          |
| fullyQualifiedDomainNames? | `string[]`                                                                                     | Fully qualified domain names (FQDN) for outbound rules |
| emailAddresses?            | `string[]`                                                                                     | Email addresses for outbound rules                     |
| phoneNumbers?              | `string[]`                                                                                     | Phone numbers for outbound rules                       |

### `ApiVersionParameter` {#Azure.ResourceManager.CommonTypes.ApiVersionParameter}

The default api-version parameter type.

```typespec
model Azure.ResourceManager.CommonTypes.ApiVersionParameter
```

#### Properties

| Name       | Type     | Description                                |
| ---------- | -------- | ------------------------------------------ |
| apiVersion | `string` | The API version to use for this operation. |

### `AzureEntityResource` {#Azure.ResourceManager.CommonTypes.AzureEntityResource}

The resource model definition for an Azure Resource Manager resource with an etag.

```typespec
model Azure.ResourceManager.CommonTypes.AzureEntityResource
```

#### Properties

| Name  | Type     | Description    |
| ----- | -------- | -------------- |
| etag? | `string` | Resource Etag. |

### `CheckNameAvailabilityRequest` {#Azure.ResourceManager.CommonTypes.CheckNameAvailabilityRequest}

The check availability request body.

```typespec
model Azure.ResourceManager.CommonTypes.CheckNameAvailabilityRequest
```

#### Properties

| Name  | Type     | Description                                                          |
| ----- | -------- | -------------------------------------------------------------------- |
| name? | `string` | The name of the resource for which availability needs to be checked. |
| type? | `string` | The resource type.                                                   |

### `CheckNameAvailabilityResponse` {#Azure.ResourceManager.CommonTypes.CheckNameAvailabilityResponse}

The check availability result.

```typespec
model Azure.ResourceManager.CommonTypes.CheckNameAvailabilityResponse
```

#### Properties

| Name           | Type                                                                                                           | Description                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| nameAvailable? | `boolean`                                                                                                      | Indicates if the resource name is available.         |
| reason?        | [`CheckNameAvailabilityReason`](./data-types.md#Azure.ResourceManager.CommonTypes.CheckNameAvailabilityReason) | The reason why the given name is not available.      |
| message?       | `string`                                                                                                       | Detailed reason why the given name is not available. |

### `CustomerManagedKeyEncryption` {#Azure.ResourceManager.CommonTypes.CustomerManagedKeyEncryption}

Customer-managed key encryption properties for the resource.

```typespec
model Azure.ResourceManager.CommonTypes.CustomerManagedKeyEncryption
```

#### Properties

| Name                      | Type                                                                                                     | Description                                                                                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| keyEncryptionKeyIdentity? | [`KeyEncryptionKeyIdentity`](./data-types.md#Azure.ResourceManager.CommonTypes.KeyEncryptionKeyIdentity) | All identity configuration for Customer-managed key settings defining which identity should be used to auth to Key Vault.                                                                              |
| keyEncryptionKeyUrl?      | `string`                                                                                                 | key encryption key Url, versioned or non-versioned. Ex: https://contosovault.vault.azure.net/keys/contosokek/562a4bb76b524a1493a6afe8e536ee78 or https://contosovault.vault.azure.net/keys/contosokek. |

### `DelegatedResource` {#Azure.ResourceManager.CommonTypes.DelegatedResource}

Delegated resource properties - internal use only.

```typespec
model Azure.ResourceManager.CommonTypes.DelegatedResource
```

#### Properties

| Name              | Type        | Description                                                                  |
| ----------------- | ----------- | ---------------------------------------------------------------------------- |
| resourceId?       | `string`    | The ARM resource id of the delegated resource - internal use only.           |
| tenantId?         | `Core.uuid` | The tenant id of the delegated resource - internal use only.                 |
| referralResource? | `string`    | The delegation id of the referral delegation (optional) - internal use only. |
| location?         | `string`    | The source resource location - internal use only.                            |

### `DelegatedResources` {#Azure.ResourceManager.CommonTypes.DelegatedResources}

The set of delegated resources. The delegated resources dictionary keys will be source resource internal ids - internal use only.

```typespec
model Azure.ResourceManager.CommonTypes.DelegatedResources
```

#### Properties

| Name | Type                                                                                       | Description           |
| ---- | ------------------------------------------------------------------------------------------ | --------------------- |
|      | [`DelegatedResource`](./data-types.md#Azure.ResourceManager.CommonTypes.DelegatedResource) | Additional properties |

### `Encryption` {#Azure.ResourceManager.CommonTypes.Encryption}

(Optional) Discouraged to include in resource definition. Only needed where it is possible to disable platform (AKA infrastructure) encryption. Azure SQL TDE is an example of this. Values are enabled and disabled.

```typespec
model Azure.ResourceManager.CommonTypes.Encryption
```

#### Properties

| Name                          | Type                                                                                                             | Description                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| infrastructureEncryption?     | [`InfrastructureEncryption`](./data-types.md#Azure.ResourceManager.CommonTypes.InfrastructureEncryption)         | Values are enabled and disabled.                                 |
| customerManagedKeyEncryption? | [`CustomerManagedKeyEncryption`](./data-types.md#Azure.ResourceManager.CommonTypes.CustomerManagedKeyEncryption) | All Customer-managed key encryption properties for the resource. |

### `EncryptionProperties` {#Azure.ResourceManager.CommonTypes.EncryptionProperties}

Configuration of key for data encryption

```typespec
model Azure.ResourceManager.CommonTypes.EncryptionProperties
```

#### Properties

| Name                | Type                                                                                         | Description                                                                |
| ------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| status?             | [`EncryptionStatus`](./data-types.md#Azure.ResourceManager.CommonTypes.EncryptionStatus)     | Indicates whether or not the encryption is enabled for container registry. |
| keyVaultProperties? | [`KeyVaultProperties`](./data-types.md#Azure.ResourceManager.CommonTypes.KeyVaultProperties) | Key vault properties.                                                      |

### `ErrorAdditionalInfo` {#Azure.ResourceManager.CommonTypes.ErrorAdditionalInfo}

The resource management error additional info.

```typespec
model Azure.ResourceManager.CommonTypes.ErrorAdditionalInfo
```

#### Properties

| Name  | Type     | Description               |
| ----- | -------- | ------------------------- |
| type? | `string` | The additional info type. |
| info? | `{}`     | The additional info.      |

### `ErrorDetail` {#Azure.ResourceManager.CommonTypes.ErrorDetail}

The error detail.

```typespec
model Azure.ResourceManager.CommonTypes.ErrorDetail
```

#### Properties

| Name            | Type                                                | Description                |
| --------------- | --------------------------------------------------- | -------------------------- |
| code?           | `string`                                            | The error code.            |
| message?        | `string`                                            | The error message.         |
| target?         | `string`                                            | The error target.          |
| details?        | `ResourceManager.CommonTypes.ErrorDetail[]`         | The error details.         |
| additionalInfo? | `ResourceManager.CommonTypes.ErrorAdditionalInfo[]` | The error additional info. |

### `ErrorResponse` {#Azure.ResourceManager.CommonTypes.ErrorResponse}

Common error response for all Azure Resource Manager APIs to return error details for failed operations.

```typespec
model Azure.ResourceManager.CommonTypes.ErrorResponse
```

#### Properties

| Name   | Type                                                                           | Description       |
| ------ | ------------------------------------------------------------------------------ | ----------------- |
| error? | [`ErrorDetail`](./data-types.md#Azure.ResourceManager.CommonTypes.ErrorDetail) | The error object. |

### `ExtendedLocation` {#Azure.ResourceManager.CommonTypes.ExtendedLocation}

The complex type of the extended location.

```typespec
model Azure.ResourceManager.CommonTypes.ExtendedLocation
```

#### Properties

| Name | Type                                                                                             | Description                        |
| ---- | ------------------------------------------------------------------------------------------------ | ---------------------------------- |
| name | `string`                                                                                         | The name of the extended location. |
| type | [`ExtendedLocationType`](./data-types.md#Azure.ResourceManager.CommonTypes.ExtendedLocationType) | The type of the extended location. |

### `ExtensionResource` {#Azure.ResourceManager.CommonTypes.ExtensionResource}

The base extension resource.

```typespec
model Azure.ResourceManager.CommonTypes.ExtensionResource
```

#### Properties

None

### `Identity` {#Azure.ResourceManager.CommonTypes.Identity}

Identity for the resource.

```typespec
model Azure.ResourceManager.CommonTypes.Identity
```

#### Properties

| Name         | Type                                                                                             | Description                                                       |
| ------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| principalId? | `Core.uuid`                                                                                      | The principal ID of resource identity. The value must be an UUID. |
| tenantId?    | `Core.uuid`                                                                                      | The tenant ID of resource. The value must be an UUID.             |
| type?        | [`ResourceIdentityType`](./data-types.md#Azure.ResourceManager.CommonTypes.ResourceIdentityType) | The identity type.                                                |

### `IfMatchHeader` {#Azure.ResourceManager.CommonTypes.IfMatchHeader}

The default ARM If-Match header type.

```typespec
model Azure.ResourceManager.CommonTypes.IfMatchHeader
```

#### Properties

| Name    | Type     | Description                                           |
| ------- | -------- | ----------------------------------------------------- |
| ifMatch | `string` | The If-Match header that makes a request conditional. |

### `IfNoneMatchHeader` {#Azure.ResourceManager.CommonTypes.IfNoneMatchHeader}

The default ARM If-Match header type.

```typespec
model Azure.ResourceManager.CommonTypes.IfNoneMatchHeader
```

#### Properties

| Name        | Type     | Description                                                |
| ----------- | -------- | ---------------------------------------------------------- |
| ifNoneMatch | `string` | The If-None-Match header that makes a request conditional. |

### `KeyEncryptionKeyIdentity` {#Azure.ResourceManager.CommonTypes.KeyEncryptionKeyIdentity}

All identity configuration for Customer-managed key settings defining which identity should be used to auth to Key Vault.

```typespec
model Azure.ResourceManager.CommonTypes.KeyEncryptionKeyIdentity
```

#### Properties

| Name                            | Type                                                                                                             | Description                                                                                                                                                                                                                                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| identityType?                   | [`KeyEncryptionKeyIdentityType`](./data-types.md#Azure.ResourceManager.CommonTypes.KeyEncryptionKeyIdentityType) | The type of identity to use. Values can be systemAssignedIdentity, userAssignedIdentity, or delegatedResourceIdentity.                                                                                                                                                                                                             |
| userAssignedIdentityResourceId? | `Core.armResourceIdentifier`                                                                                     | User assigned identity to use for accessing key encryption key Url. Ex: /subscriptions/fa5fc227-a624-475e-b696-cdd604c735bc/resourceGroups/<resource group>/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myId. Mutually exclusive with identityType systemAssignedIdentity.                                          |
| federatedClientId?              | `Core.uuid`                                                                                                      | application client identity to use for accessing key encryption key Url in a different tenant. Ex: f83c6b1b-4d34-47e4-bb34-9d83df58b540                                                                                                                                                                                            |
| delegatedIdentityClientId?      | `Core.uuid`                                                                                                      | delegated identity to use for accessing key encryption key Url. Ex: /subscriptions/fa5fc227-a624-475e-b696-cdd604c735bc/resourceGroups/<resource group>/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myId. Mutually exclusive with identityType systemAssignedIdentity and userAssignedIdentity - internal use only. |

### `KeyVaultProperties` {#Azure.ResourceManager.CommonTypes.KeyVaultProperties}

```typespec
model Azure.ResourceManager.CommonTypes.KeyVaultProperties
```

#### Properties

| Name           | Type     | Description                                                           |
| -------------- | -------- | --------------------------------------------------------------------- |
| keyIdentifier? | `string` | Key vault uri to access the encryption key.                           |
| identity?      | `string` | The client ID of the identity which will be used to access key vault. |

### `LocationData` {#Azure.ResourceManager.CommonTypes.LocationData}

Metadata pertaining to the geographic location of the resource.

```typespec
model Azure.ResourceManager.CommonTypes.LocationData
```

#### Properties

| Name             | Type     | Description                                                     |
| ---------------- | -------- | --------------------------------------------------------------- |
| name             | `string` | A canonical name for the geographic or physical location.       |
| city?            | `string` | The city or locality where the resource is located.             |
| district?        | `string` | The district, state, or province where the resource is located. |
| countryOrRegion? | `string` | The country or region where the resource is located             |

### `LocationParameter` {#Azure.ResourceManager.CommonTypes.LocationParameter}

The default location parameter type.

```typespec
model Azure.ResourceManager.CommonTypes.LocationParameter
```

#### Properties

| Name     | Type     | Description               |
| -------- | -------- | ------------------------- |
| location | `string` | The name of Azure region. |

### `LocationResourceParameter` {#Azure.ResourceManager.CommonTypes.LocationResourceParameter}

The default location parameter type.

```typespec
model Azure.ResourceManager.CommonTypes.LocationResourceParameter
```

#### Properties

| Name     | Type                 | Description                   |
| -------- | -------------------- | ----------------------------- |
| location | `Core.azureLocation` | The name of the Azure region. |

### `ManagedOnBehalfOfConfiguration` {#Azure.ResourceManager.CommonTypes.ManagedOnBehalfOfConfiguration}

Managed-On-Behalf-Of configuration properties. This configuration exists for the resources where a resource provider manages those resources on behalf of the resource owner.

```typespec
model Azure.ResourceManager.CommonTypes.ManagedOnBehalfOfConfiguration
```

#### Properties

| Name                 | Type                                               | Description                           |
| -------------------- | -------------------------------------------------- | ------------------------------------- |
| moboBrokerResources? | `ResourceManager.CommonTypes.MoboBrokerResource[]` | Managed-On-Behalf-Of broker resources |

### `ManagedServiceIdentity` {#Azure.ResourceManager.CommonTypes.ManagedServiceIdentity}

Managed service identity (system assigned and/or user assigned identities)

```typespec
model Azure.ResourceManager.CommonTypes.ManagedServiceIdentity
```

#### Properties

| Name                    | Type                                                                                                         | Description                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| principalId?            | `Core.uuid`                                                                                                  | The service principal ID of the system assigned identity. This property will only be provided for a system assigned identity. |
| tenantId?               | `Core.uuid`                                                                                                  | The tenant ID of the system assigned identity. This property will only be provided for a system assigned identity.            |
| type                    | [`ManagedServiceIdentityType`](./data-types.md#Azure.ResourceManager.CommonTypes.ManagedServiceIdentityType) | The type of managed identity assigned to this resource.                                                                       |
| userAssignedIdentities? | `Record<ResourceManager.CommonTypes.UserAssignedIdentity \| null>`                                           | The identities assigned to this resource by the user.                                                                         |

### `ManagedServiceIdentityWithDelegation` {#Azure.ResourceManager.CommonTypes.ManagedServiceIdentityWithDelegation}

Managed service identity (system assigned and/or user assigned identities and/or delegated identities) - internal use only.

```typespec
model Azure.ResourceManager.CommonTypes.ManagedServiceIdentityWithDelegation
```

#### Properties

| Name                | Type                                                                                         | Description |
| ------------------- | -------------------------------------------------------------------------------------------- | ----------- |
| delegatedResources? | [`DelegatedResources`](./data-types.md#Azure.ResourceManager.CommonTypes.DelegatedResources) |             |

### `ManagementGroupNameParameter` {#Azure.ResourceManager.CommonTypes.ManagementGroupNameParameter}

The default ManagementGroupName parameter type.

```typespec
model Azure.ResourceManager.CommonTypes.ManagementGroupNameParameter
```

#### Properties

| Name                | Type     | Description                                                     |
| ------------------- | -------- | --------------------------------------------------------------- |
| managementGroupName | `string` | The name of the management group. The name is case insensitive. |

### `MoboBrokerResource` {#Azure.ResourceManager.CommonTypes.MoboBrokerResource}

Managed-On-Behalf-Of broker resource. This resource is created by the Resource Provider to manage some resources on behalf of the user.

```typespec
model Azure.ResourceManager.CommonTypes.MoboBrokerResource
```

#### Properties

| Name | Type                         | Description                                                   |
| ---- | ---------------------------- | ------------------------------------------------------------- |
| id?  | `Core.armResourceIdentifier` | Resource identifier of a Managed-On-Behalf-Of broker resource |

### `NetworkSecurityPerimeter` {#Azure.ResourceManager.CommonTypes.NetworkSecurityPerimeter}

Information about a network security perimeter (NSP)

```typespec
model Azure.ResourceManager.CommonTypes.NetworkSecurityPerimeter
```

#### Properties

| Name           | Type                         | Description                                                  |
| -------------- | ---------------------------- | ------------------------------------------------------------ |
| id?            | `Core.armResourceIdentifier` | Fully qualified Azure resource ID of the NSP resource        |
| perimeterGuid? | `Core.uuid`                  | Universal unique ID (UUID) of the network security perimeter |
| location?      | `string`                     | Location of the network security perimeter                   |

### `NetworkSecurityPerimeterConfiguration` {#Azure.ResourceManager.CommonTypes.NetworkSecurityPerimeterConfiguration}

Network security perimeter (NSP) configuration resource

```typespec
model Azure.ResourceManager.CommonTypes.NetworkSecurityPerimeterConfiguration
```

#### Properties

| Name        | Type                                                                                                                                                   | Description |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| properties? | [`NetworkSecurityPerimeterConfigurationProperties`](./data-types.md#Azure.ResourceManager.CommonTypes.NetworkSecurityPerimeterConfigurationProperties) |             |

### `NetworkSecurityPerimeterConfigurationListResult` {#Azure.ResourceManager.CommonTypes.NetworkSecurityPerimeterConfigurationListResult}

Result of a list NSP (network security perimeter) configurations request.

```typespec
model Azure.ResourceManager.CommonTypes.NetworkSecurityPerimeterConfigurationListResult
```

#### Properties

| Name      | Type                                                                  | Description                                    |
| --------- | --------------------------------------------------------------------- | ---------------------------------------------- |
| value?    | `ResourceManager.CommonTypes.NetworkSecurityPerimeterConfiguration[]` | Array of network security perimeter results.   |
| nextLink? | `url`                                                                 | The link used to get the next page of results. |

### `NetworkSecurityPerimeterConfigurationNameParameter` {#Azure.ResourceManager.CommonTypes.NetworkSecurityPerimeterConfigurationNameParameter}

The name for a network security perimeter configuration

```typespec
model Azure.ResourceManager.CommonTypes.NetworkSecurityPerimeterConfigurationNameParameter<Segment>
```

#### Template Parameters

| Name    | Description                                                                                                             |
| ------- | ----------------------------------------------------------------------------------------------------------------------- |
| Segment | The resource type name for network security perimeter configuration (default is networkSecurityPerimeterConfigurations) |

#### Properties

| Name | Type     | Description                                             |
| ---- | -------- | ------------------------------------------------------- |
| name | `string` | The name for a network security perimeter configuration |

### `NetworkSecurityPerimeterConfigurationProperties` {#Azure.ResourceManager.CommonTypes.NetworkSecurityPerimeterConfigurationProperties}

Network security configuration properties.

```typespec
model Azure.ResourceManager.CommonTypes.NetworkSecurityPerimeterConfigurationProperties
```

#### Properties

| Name                      | Type                                                                                                                                                                 | Description                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| provisioningState?        | [`NetworkSecurityPerimeterConfigurationProvisioningState`](./data-types.md#Azure.ResourceManager.CommonTypes.NetworkSecurityPerimeterConfigurationProvisioningState) |                                     |
| provisioningIssues?       | `ResourceManager.CommonTypes.ProvisioningIssue[]`                                                                                                                    | List of provisioning issues, if any |
| networkSecurityPerimeter? | [`NetworkSecurityPerimeter`](./data-types.md#Azure.ResourceManager.CommonTypes.NetworkSecurityPerimeter)                                                             |                                     |
| resourceAssociation?      | [`ResourceAssociation`](./data-types.md#Azure.ResourceManager.CommonTypes.ResourceAssociation)                                                                       |                                     |
| profile?                  | [`NetworkSecurityProfile`](./data-types.md#Azure.ResourceManager.CommonTypes.NetworkSecurityProfile)                                                                 |                                     |

### `NetworkSecurityProfile` {#Azure.ResourceManager.CommonTypes.NetworkSecurityProfile}

Network security perimeter configuration profile

```typespec
model Azure.ResourceManager.CommonTypes.NetworkSecurityProfile
```

#### Properties

| Name                       | Type                                       | Description                             |
| -------------------------- | ------------------------------------------ | --------------------------------------- |
| name?                      | `string`                                   | Name of the profile                     |
| accessRulesVersion?        | `int32`                                    | Current access rules version            |
| accessRules?               | `ResourceManager.CommonTypes.AccessRule[]` | List of Access Rules                    |
| diagnosticSettingsVersion? | `int32`                                    | Current diagnostic settings version     |
| enabledLogCategories?      | `string[]`                                 | List of log categories that are enabled |

### `Operation` {#Azure.ResourceManager.CommonTypes.Operation}

Details of a REST API operation, returned from the Resource Provider Operations API

```typespec
model Azure.ResourceManager.CommonTypes.Operation
```

#### Properties

| Name          | Type                                                                                     | Description                                                                                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name?         | `string`                                                                                 | The name of the operation, as per Resource-Based Access Control (RBAC). Examples: "Microsoft.Compute/virtualMachines/write", "Microsoft.Compute/virtualMachines/capture/action" |
| isDataAction? | `boolean`                                                                                | Whether the operation applies to data-plane. This is "true" for data-plane operations and "false" for Azure Resource Manager/control-plane operations.                          |
| display?      | [`OperationDisplay`](./data-types.md#Azure.ResourceManager.CommonTypes.OperationDisplay) | Localized display information for this particular operation.                                                                                                                    |
| origin?       | [`Origin`](./data-types.md#Azure.ResourceManager.CommonTypes.Origin)                     | The intended executor of the operation; as in Resource Based Access Control (RBAC) and audit logs UX. Default value is "user,system"                                            |
| actionType?   | [`ActionType`](./data-types.md#Azure.ResourceManager.CommonTypes.ActionType)             | Extensible enum. Indicates the action type. "Internal" refers to actions that are for internal only APIs.                                                                       |

### `OperationDisplay` {#Azure.ResourceManager.CommonTypes.OperationDisplay}

Localized display information for and operation.

```typespec
model Azure.ResourceManager.CommonTypes.OperationDisplay
```

#### Properties

| Name         | Type     | Description                                                                                                                                         |
| ------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| provider?    | `string` | The localized friendly form of the resource provider name, e.g. "Microsoft Monitoring Insights" or "Microsoft Compute".                             |
| resource?    | `string` | The localized friendly name of the resource type related to this operation. E.g. "Virtual Machines" or "Job Schedule Collections".                  |
| operation?   | `string` | The concise, localized friendly name for the operation; suitable for dropdowns. E.g. "Create or Update Virtual Machine", "Restart Virtual Machine". |
| description? | `string` | The short, localized friendly description of the operation; suitable for tool tips and detailed views.                                              |

### `OperationIdParameter` {#Azure.ResourceManager.CommonTypes.OperationIdParameter}

The default operationId parameter type.

```typespec
model Azure.ResourceManager.CommonTypes.OperationIdParameter
```

#### Properties

| Name        | Type     | Description                           |
| ----------- | -------- | ------------------------------------- |
| operationId | `string` | The ID of an ongoing async operation. |

### `OperationListResult` {#Azure.ResourceManager.CommonTypes.OperationListResult}

A list of REST API operations supported by an Azure Resource Provider. It contains an URL link to get the next set of results.

```typespec
model Azure.ResourceManager.CommonTypes.OperationListResult
```

#### Properties

| Name      | Type                                      | Description                        |
| --------- | ----------------------------------------- | ---------------------------------- |
| value     | `ResourceManager.CommonTypes.Operation[]` | The Operation items on this page   |
| nextLink? | `TypeSpec.Rest.ResourceLocation`          | The link to the next page of items |

### `OperationStatusResult` {#Azure.ResourceManager.CommonTypes.OperationStatusResult}

The current status of an async operation.

```typespec
model Azure.ResourceManager.CommonTypes.OperationStatusResult
```

#### Properties

| Name             | Type                                                                           | Description                                 |
| ---------------- | ------------------------------------------------------------------------------ | ------------------------------------------- |
| id?              | `string`                                                                       | Fully qualified ID for the async operation. |
| name?            | `string`                                                                       | Name of the async operation.                |
| status           | `string`                                                                       | Operation status.                           |
| percentComplete? | `float64`                                                                      | Percent of the operation that is complete.  |
| startTime?       | `utcDateTime`                                                                  | The start time of the operation.            |
| endTime?         | `utcDateTime`                                                                  | The end time of the operation.              |
| operations?      | `ResourceManager.CommonTypes.OperationStatusResult[]`                          | The operations list.                        |
| error?           | [`ErrorDetail`](./data-types.md#Azure.ResourceManager.CommonTypes.ErrorDetail) | If present, details of the operation error. |

### `Plan` {#Azure.ResourceManager.CommonTypes.Plan}

Plan for the resource.

```typespec
model Azure.ResourceManager.CommonTypes.Plan
```

#### Properties

| Name           | Type     | Description                                                                                                                                                 |
| -------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name           | `string` | A user defined name of the 3rd Party Artifact that is being procured.                                                                                       |
| publisher      | `string` | The publisher of the 3rd Party Artifact that is being bought. E.g. NewRelic                                                                                 |
| product        | `string` | The 3rd Party artifact that is being procured. E.g. NewRelic. Product maps to the OfferID specified for the artifact at the time of Data Market onboarding. |
| promotionCode? | `string` | A publisher provided promotion code as provisioned in Data Market for the said product/artifact.                                                            |
| version?       | `string` | The version of the desired product/artifact.                                                                                                                |

### `PrivateEndpoint` {#Azure.ResourceManager.CommonTypes.PrivateEndpoint}

The Private Endpoint resource.

```typespec
model Azure.ResourceManager.CommonTypes.PrivateEndpoint
```

#### Properties

| Name | Type                         | Description                                  |
| ---- | ---------------------------- | -------------------------------------------- |
| id?  | `Core.armResourceIdentifier` | The resource identifier for private endpoint |

### `PrivateEndpointConnection` {#Azure.ResourceManager.CommonTypes.PrivateEndpointConnection}

The private endpoint connection resource

```typespec
model Azure.ResourceManager.CommonTypes.PrivateEndpointConnection
```

#### Properties

| Name        | Type                                                                                                                           | Description                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| properties? | [`PrivateEndpointConnectionProperties`](./data-types.md#Azure.ResourceManager.CommonTypes.PrivateEndpointConnectionProperties) | The private endpoint connection properties |

### `PrivateEndpointConnectionListResult` {#Azure.ResourceManager.CommonTypes.PrivateEndpointConnectionListResult}

List of private endpoint connections associated with the specified resource.

```typespec
model Azure.ResourceManager.CommonTypes.PrivateEndpointConnectionListResult
```

#### Properties

| Name   | Type                                                      | Description                            |
| ------ | --------------------------------------------------------- | -------------------------------------- |
| value? | `ResourceManager.CommonTypes.PrivateEndpointConnection[]` | Array of private endpoint connections. |

### `PrivateEndpointConnectionParameter` {#Azure.ResourceManager.CommonTypes.PrivateEndpointConnectionParameter}

The name of the private endpoint connection associated with the Azure resource.

```typespec
model Azure.ResourceManager.CommonTypes.PrivateEndpointConnectionParameter<Segment>
```

#### Template Parameters

| Name    | Description                                                                                     |
| ------- | ----------------------------------------------------------------------------------------------- |
| Segment | The resource type name for private endpoint connections (default is privateEndpointConnections) |

#### Properties

| Name | Type     | Description                                                                     |
| ---- | -------- | ------------------------------------------------------------------------------- |
| name | `string` | The name of the private endpoint connection associated with the Azure resource. |

### `PrivateEndpointConnectionProperties` {#Azure.ResourceManager.CommonTypes.PrivateEndpointConnectionProperties}

Properties of the private endpoint connection.

```typespec
model Azure.ResourceManager.CommonTypes.PrivateEndpointConnectionProperties
```

#### Properties

| Name                              | Type                                                                                                                                         | Description                                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| groupIds?                         | `string[]`                                                                                                                                   | The group ids for the private endpoint resource.                                                     |
| privateEndpoint?                  | [`PrivateEndpoint`](./data-types.md#Azure.ResourceManager.CommonTypes.PrivateEndpoint)                                                       | The private endpoint resource.                                                                       |
| privateLinkServiceConnectionState | [`PrivateLinkServiceConnectionState`](./data-types.md#Azure.ResourceManager.CommonTypes.PrivateLinkServiceConnectionState)                   | A collection of information about the state of the connection between service consumer and provider. |
| provisioningState?                | [`PrivateEndpointConnectionProvisioningState`](./data-types.md#Azure.ResourceManager.CommonTypes.PrivateEndpointConnectionProvisioningState) | The provisioning state of the private endpoint connection resource.                                  |

### `PrivateLinkResource` {#Azure.ResourceManager.CommonTypes.PrivateLinkResource}

A private link resource.

```typespec
model Azure.ResourceManager.CommonTypes.PrivateLinkResource
```

#### Properties

| Name        | Type                                                                                                               | Description          |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | -------------------- |
| properties? | [`PrivateLinkResourceProperties`](./data-types.md#Azure.ResourceManager.CommonTypes.PrivateLinkResourceProperties) | Resource properties. |

### `PrivateLinkResourceListResult` {#Azure.ResourceManager.CommonTypes.PrivateLinkResourceListResult}

A list of private link resources.

```typespec
model Azure.ResourceManager.CommonTypes.PrivateLinkResourceListResult
```

#### Properties

| Name   | Type                                                | Description                     |
| ------ | --------------------------------------------------- | ------------------------------- |
| value? | `ResourceManager.CommonTypes.PrivateLinkResource[]` | Array of private link resources |

### `PrivateLinkResourceParameter` {#Azure.ResourceManager.CommonTypes.PrivateLinkResourceParameter}

The name of the private link associated with the Azure resource.

```typespec
model Azure.ResourceManager.CommonTypes.PrivateLinkResourceParameter<Segment>
```

#### Template Parameters

| Name    | Description                                                                |
| ------- | -------------------------------------------------------------------------- |
| Segment | The resource type name for private links (default is privateLinkResources) |

#### Properties

| Name | Type     | Description                                                      |
| ---- | -------- | ---------------------------------------------------------------- |
| name | `string` | The name of the private link associated with the Azure resource. |

### `PrivateLinkResourceProperties` {#Azure.ResourceManager.CommonTypes.PrivateLinkResourceProperties}

Properties of a private link resource.

```typespec
model Azure.ResourceManager.CommonTypes.PrivateLinkResourceProperties
```

#### Properties

| Name               | Type       | Description                                           |
| ------------------ | ---------- | ----------------------------------------------------- |
| groupId?           | `string`   | The private link resource group id.                   |
| requiredMembers?   | `string[]` | The private link resource required member names.      |
| requiredZoneNames? | `string[]` | The private link resource private link DNS zone name. |

### `PrivateLinkServiceConnectionState` {#Azure.ResourceManager.CommonTypes.PrivateLinkServiceConnectionState}

A collection of information about the state of the connection between service consumer and provider.

```typespec
model Azure.ResourceManager.CommonTypes.PrivateLinkServiceConnectionState
```

#### Properties

| Name             | Type                                                                                                                                 | Description                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| status?          | [`PrivateEndpointServiceConnectionStatus`](./data-types.md#Azure.ResourceManager.CommonTypes.PrivateEndpointServiceConnectionStatus) | Indicates whether the connection has been Approved/Rejected/Removed by the owner of the service. |
| description?     | `string`                                                                                                                             | The reason for approval/rejection of the connection.                                             |
| actionsRequired? | `string`                                                                                                                             | A message indicating if changes on the service provider require any updates on the consumer.     |

### `ProvisioningIssue` {#Azure.ResourceManager.CommonTypes.ProvisioningIssue}

Describes a provisioning issue for a network security perimeter configuration

```typespec
model Azure.ResourceManager.CommonTypes.ProvisioningIssue
```

#### Properties

| Name        | Type                                                                                                           | Description       |
| ----------- | -------------------------------------------------------------------------------------------------------------- | ----------------- |
| name?       | `string`                                                                                                       | Name of the issue |
| properties? | [`ProvisioningIssueProperties`](./data-types.md#Azure.ResourceManager.CommonTypes.ProvisioningIssueProperties) |                   |

### `ProvisioningIssueProperties` {#Azure.ResourceManager.CommonTypes.ProvisioningIssueProperties}

Details of a provisioning issue for a network security perimeter (NSP) configuration. Resource providers should generate separate provisioning issue elements for each separate issue detected, and include a meaningful and distinctive description, as well as any appropriate suggestedResourceIds and suggestedAccessRules

```typespec
model Azure.ResourceManager.CommonTypes.ProvisioningIssueProperties
```

#### Properties

| Name                  | Type                                                                       | Description                                                                                                                                |
| --------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| issueType?            | [`IssueType`](./data-types.md#Azure.ResourceManager.CommonTypes.IssueType) | Type of issue                                                                                                                              |
| severity?             | [`Severity`](./data-types.md#Azure.ResourceManager.CommonTypes.Severity)   | Severity of the issue.                                                                                                                     |
| description?          | `string`                                                                   | Description of the issue                                                                                                                   |
| suggestedResourceIds? | `Core.armResourceIdentifier[]`                                             | Fully qualified resource IDs of suggested resources that can be associated to the network security perimeter (NSP) to remediate the issue. |
| suggestedAccessRules? | `ResourceManager.CommonTypes.AccessRule[]`                                 | Access rules that can be added to the network security profile (NSP) to remediate the issue.                                               |

### `ProxyResource` {#Azure.ResourceManager.CommonTypes.ProxyResource}

The resource model definition for a Azure Resource Manager proxy resource. It will not have tags and a location

```typespec
model Azure.ResourceManager.CommonTypes.ProxyResource
```

#### Properties

None

### `Resource` {#Azure.ResourceManager.CommonTypes.Resource}

Common fields that are returned in the response for all Azure Resource Manager resources

```typespec
model Azure.ResourceManager.CommonTypes.Resource
```

#### Properties

| Name        | Type                                                                         | Description                                                                                                                                                                               |
| ----------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id?         | `Core.armResourceIdentifier`                                                 | Fully qualified resource ID for the resource. Ex - /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{resourceProviderNamespace}/{resourceType}/{resourceName} |
| name?       | `string`                                                                     | The name of the resource                                                                                                                                                                  |
| type?       | `string`                                                                     | The type of the resource. E.g. "Microsoft.Compute/virtualMachines" or "Microsoft.Storage/storageAccounts"                                                                                 |
| systemData? | [`SystemData`](./data-types.md#Azure.ResourceManager.CommonTypes.SystemData) | Azure Resource Manager metadata containing createdBy and modifiedBy information.                                                                                                          |

### `ResourceAssociation` {#Azure.ResourceManager.CommonTypes.ResourceAssociation}

Information about resource association

```typespec
model Azure.ResourceManager.CommonTypes.ResourceAssociation
```

#### Properties

| Name        | Type                                                                                                               | Description                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| name?       | `string`                                                                                                           | Name of the resource association |
| accessMode? | [`ResourceAssociationAccessMode`](./data-types.md#Azure.ResourceManager.CommonTypes.ResourceAssociationAccessMode) |                                  |

### `ResourceGroupNameParameter` {#Azure.ResourceManager.CommonTypes.ResourceGroupNameParameter}

The default resource group parameter type.

```typespec
model Azure.ResourceManager.CommonTypes.ResourceGroupNameParameter
```

#### Properties

| Name              | Type     | Description                                                   |
| ----------------- | -------- | ------------------------------------------------------------- |
| resourceGroupName | `string` | The name of the resource group. The name is case insensitive. |

### `ResourceModelWithAllowedPropertySet` {#Azure.ResourceManager.CommonTypes.ResourceModelWithAllowedPropertySet}

The resource model definition containing the full set of allowed properties for a resource. Except properties bag, there cannot be a top level property outside of this set.

```typespec
model Azure.ResourceManager.CommonTypes.ResourceModelWithAllowedPropertySet
```

#### Properties

| Name       | Type                                                                     | Description                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| managedBy? | `string`                                                                 | The fully qualified resource ID of the resource that manages this resource. Indicates if this resource is managed by another Azure resource.<br />If this is present, complete mode deployment will not delete the resource if it is removed from the template since it is managed by another resource.                                                                                                        |
| kind?      | `string`                                                                 | Metadata used by portal/tooling/etc to render different UX experiences for resources of the same type; e.g. ApiApps are a kind of Microsoft.Web/sites type.<br />If supported, the resource provider must validate and persist this value.                                                                                                                                                                     |
| eTag?      | `string`                                                                 | The etag field is _not_ required. If it is provided in the response body, it must also be provided as a header per the normal etag convention.<br />Entity tags are used for comparing two or more entities from the same requested resource. HTTP/1.1 uses entity tags in the etag (section 14.19),<br />If-Match (section 14.24), If-None-Match (section 14.26), and If-Range (section 14.27) header fields. |
| identity?  | [`Identity`](./data-types.md#Azure.ResourceManager.CommonTypes.Identity) |                                                                                                                                                                                                                                                                                                                                                                                                                |
| sku?       | [`Sku`](./data-types.md#Azure.ResourceManager.CommonTypes.Sku)           |                                                                                                                                                                                                                                                                                                                                                                                                                |
| plan?      | [`Plan`](./data-types.md#Azure.ResourceManager.CommonTypes.Plan)         |                                                                                                                                                                                                                                                                                                                                                                                                                |

### `ScopeParameter` {#Azure.ResourceManager.CommonTypes.ScopeParameter}

The default Scope parameter type.

```typespec
model Azure.ResourceManager.CommonTypes.ScopeParameter
```

#### Properties

| Name  | Type     | Description                                    |
| ----- | -------- | ---------------------------------------------- |
| scope | `string` | The scope at which the operation is performed. |

### `Sku` {#Azure.ResourceManager.CommonTypes.Sku}

The resource model definition representing SKU

```typespec
model Azure.ResourceManager.CommonTypes.Sku
```

#### Properties

| Name      | Type                                                                   | Description                                                                                                                                          |
| --------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| name      | `string`                                                               | The name of the SKU. Ex - P3. It is typically a letter+number code                                                                                   |
| tier?     | [`SkuTier`](./data-types.md#Azure.ResourceManager.CommonTypes.SkuTier) | This field is required to be implemented by the Resource Provider if the service has more than one tier, but is not required on a PUT.               |
| size?     | `string`                                                               | The SKU size. When the name field is the combination of tier and some other value, this would be the standalone code.                                |
| family?   | `string`                                                               | If the service has different generations of hardware, for the same SKU, then that can be captured here.                                              |
| capacity? | `int32`                                                                | If the SKU supports scale out/in then the capacity integer should be included. If scale out/in is not possible for the resource this may be omitted. |

### `SubscriptionIdParameter` {#Azure.ResourceManager.CommonTypes.SubscriptionIdParameter}

The default subscriptionId parameter type.

```typespec
model Azure.ResourceManager.CommonTypes.SubscriptionIdParameter
```

#### Properties

| Name           | Type        | Description                                                   |
| -------------- | ----------- | ------------------------------------------------------------- |
| subscriptionId | `Core.uuid` | The ID of the target subscription. The value must be an UUID. |

### `SystemAssignedServiceIdentity` {#Azure.ResourceManager.CommonTypes.SystemAssignedServiceIdentity}

Managed service identity (either system assigned, or none)

```typespec
model Azure.ResourceManager.CommonTypes.SystemAssignedServiceIdentity
```

#### Properties

| Name         | Type                                                                                                                       | Description                                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| principalId? | `Core.uuid`                                                                                                                | The service principal ID of the system assigned identity. This property will only be provided for a system assigned identity. |
| tenantId?    | `Core.uuid`                                                                                                                | The tenant ID of the system assigned identity. This property will only be provided for a system assigned identity.            |
| type         | [`SystemAssignedServiceIdentityType`](./data-types.md#Azure.ResourceManager.CommonTypes.SystemAssignedServiceIdentityType) | The type of managed identity assigned to this resource.                                                                       |

### `SystemData` {#Azure.ResourceManager.CommonTypes.SystemData}

Metadata pertaining to creation and last modification of the resource.

```typespec
model Azure.ResourceManager.CommonTypes.SystemData
```

#### Properties

| Name                | Type                                                                               | Description                                           |
| ------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------- |
| createdBy?          | `string`                                                                           | The identity that created the resource.               |
| createdByType?      | [`createdByType`](./data-types.md#Azure.ResourceManager.CommonTypes.createdByType) | The type of identity that created the resource.       |
| createdAt?          | `utcDateTime`                                                                      | The timestamp of resource creation (UTC).             |
| lastModifiedBy?     | `string`                                                                           | The identity that last modified the resource.         |
| lastModifiedByType? | [`createdByType`](./data-types.md#Azure.ResourceManager.CommonTypes.createdByType) | The type of identity that last modified the resource. |
| lastModifiedAt?     | `utcDateTime`                                                                      | The timestamp of resource last modification (UTC)     |

### `TenantIdParameter` {#Azure.ResourceManager.CommonTypes.TenantIdParameter}

The default ManagementGroupName parameter type.

```typespec
model Azure.ResourceManager.CommonTypes.TenantIdParameter
```

#### Properties

| Name     | Type        | Description                                                                                      |
| -------- | ----------- | ------------------------------------------------------------------------------------------------ |
| tenantId | `Core.uuid` | The Azure tenant ID. This is a GUID-formatted string (e.g. 00000000-0000-0000-0000-000000000000) |

### `TrackedResource` {#Azure.ResourceManager.CommonTypes.TrackedResource}

The resource model definition for an Azure Resource Manager tracked top level resource which has 'tags' and a 'location'

```typespec
model Azure.ResourceManager.CommonTypes.TrackedResource
```

#### Properties

| Name     | Type             | Description                               |
| -------- | ---------------- | ----------------------------------------- |
| tags?    | `Record<string>` | Resource tags.                            |
| location | `string`         | The geo-location where the resource lives |

### `UserAssignedIdentities` {#Azure.ResourceManager.CommonTypes.UserAssignedIdentities}

:::warning
**Deprecated**: Do not use this model. Instead, use Record<UserAssignedIdentity | null> directly. Using this model will result in a different client SDK when generated from TypeSpec compared to the Swagger.
:::

The set of user assigned identities associated with the resource. The userAssignedIdentities dictionary keys will be ARM resource ids in the form: '/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/{identityName}. The dictionary values can be empty objects ({}) in requests.

```typespec
model Azure.ResourceManager.CommonTypes.UserAssignedIdentities
```

#### Properties

| Name | Type                                                       | Description           |
| ---- | ---------------------------------------------------------- | --------------------- |
|      | `ResourceManager.CommonTypes.UserAssignedIdentity \| null` | Additional properties |

### `UserAssignedIdentity` {#Azure.ResourceManager.CommonTypes.UserAssignedIdentity}

User assigned identity properties

```typespec
model Azure.ResourceManager.CommonTypes.UserAssignedIdentity
```

#### Properties

| Name         | Type        | Description                                |
| ------------ | ----------- | ------------------------------------------ |
| principalId? | `Core.uuid` | The principal ID of the assigned identity. |
| clientId?    | `Core.uuid` | The client ID of the assigned identity.    |

### `ResourceHome` {#Azure.ResourceManager.CommonTypes.ResourceHome}

An internal enum to indicate the resource support for various path types

```typespec
enum Azure.ResourceManager.CommonTypes.ResourceHome
```

| Name          | Value | Description                               |
| ------------- | ----- | ----------------------------------------- |
| Tenant        |       | The resource is bound to a tenant         |
| Subscription  |       | The resource is bound to a subscription   |
| Location      |       | The resource is bound to a location       |
| ResourceGroup |       | The resource is bound to a resource group |
| Extension     |       | The resource is bound to an extension     |

### `Versions` {#Azure.ResourceManager.CommonTypes.Versions}

The Azure Resource Manager common-types versions.

```typespec
enum Azure.ResourceManager.CommonTypes.Versions
```

| Name | Value | Description                                 |
| ---- | ----- | ------------------------------------------- |
| v3   |       | The Azure Resource Manager v3 common types. |
| v4   |       | The Azure Resource Manager v4 common types. |
| v5   |       | The Azure Resource Manager v5 common types. |

### `AccessRuleDirection` {#Azure.ResourceManager.CommonTypes.AccessRuleDirection}

Direction of Access Rule

```typespec
union Azure.ResourceManager.CommonTypes.AccessRuleDirection
```

### `ActionType` {#Azure.ResourceManager.CommonTypes.ActionType}

Extensible enum. Indicates the action type. "Internal" refers to actions that are for internal only APIs.

```typespec
union Azure.ResourceManager.CommonTypes.ActionType
```

### `CheckNameAvailabilityReason` {#Azure.ResourceManager.CommonTypes.CheckNameAvailabilityReason}

Possible reasons for a name not being available.

```typespec
union Azure.ResourceManager.CommonTypes.CheckNameAvailabilityReason
```

### `createdByType` {#Azure.ResourceManager.CommonTypes.createdByType}

The kind of entity that created the resource.

```typespec
union Azure.ResourceManager.CommonTypes.createdByType
```

### `EncryptionStatus` {#Azure.ResourceManager.CommonTypes.EncryptionStatus}

Indicates whether or not the encryption is enabled for container registry.

```typespec
union Azure.ResourceManager.CommonTypes.EncryptionStatus
```

### `ExtendedLocationType` {#Azure.ResourceManager.CommonTypes.ExtendedLocationType}

The supported ExtendedLocation types.

```typespec
union Azure.ResourceManager.CommonTypes.ExtendedLocationType
```

### `InfrastructureEncryption` {#Azure.ResourceManager.CommonTypes.InfrastructureEncryption}

(Optional) Discouraged to include in resource definition. Only needed where it is possible to disable platform (AKA infrastructure) encryption. Azure SQL TDE is an example of this. Values are enabled and disabled.

```typespec
union Azure.ResourceManager.CommonTypes.InfrastructureEncryption
```

### `IssueType` {#Azure.ResourceManager.CommonTypes.IssueType}

Type of issue

```typespec
union Azure.ResourceManager.CommonTypes.IssueType
```

### `KeyEncryptionKeyIdentityType` {#Azure.ResourceManager.CommonTypes.KeyEncryptionKeyIdentityType}

The type of identity to use.

```typespec
union Azure.ResourceManager.CommonTypes.KeyEncryptionKeyIdentityType
```

### `ManagedServiceIdentityType` {#Azure.ResourceManager.CommonTypes.ManagedServiceIdentityType}

Type of managed service identity (where both SystemAssigned and UserAssigned types are allowed).

```typespec
union Azure.ResourceManager.CommonTypes.ManagedServiceIdentityType
```

### `NetworkSecurityPerimeterConfigurationProvisioningState` {#Azure.ResourceManager.CommonTypes.NetworkSecurityPerimeterConfigurationProvisioningState}

Provisioning state of a network security perimeter configuration that is being created or updated.

```typespec
union Azure.ResourceManager.CommonTypes.NetworkSecurityPerimeterConfigurationProvisioningState
```

### `Origin` {#Azure.ResourceManager.CommonTypes.Origin}

The intended executor of the operation; as in Resource Based Access Control (RBAC) and audit logs UX. Default value is "user,system"

```typespec
union Azure.ResourceManager.CommonTypes.Origin
```

### `PrivateEndpointConnectionProvisioningState` {#Azure.ResourceManager.CommonTypes.PrivateEndpointConnectionProvisioningState}

The current provisioning state.

```typespec
union Azure.ResourceManager.CommonTypes.PrivateEndpointConnectionProvisioningState
```

### `PrivateEndpointServiceConnectionStatus` {#Azure.ResourceManager.CommonTypes.PrivateEndpointServiceConnectionStatus}

The private endpoint connection status.

```typespec
union Azure.ResourceManager.CommonTypes.PrivateEndpointServiceConnectionStatus
```

### `PublicNetworkAccess` {#Azure.ResourceManager.CommonTypes.PublicNetworkAccess}

Allow, disallow, or let network security perimeter configuration control public network access to the protected resource. Value is optional but if passed in, it must be 'Enabled', 'Disabled' or 'SecuredByPerimeter'.

```typespec
union Azure.ResourceManager.CommonTypes.PublicNetworkAccess
```

### `ResourceAssociationAccessMode` {#Azure.ResourceManager.CommonTypes.ResourceAssociationAccessMode}

Access mode of the resource association

```typespec
union Azure.ResourceManager.CommonTypes.ResourceAssociationAccessMode
```

### `ResourceIdentityType` {#Azure.ResourceManager.CommonTypes.ResourceIdentityType}

```typespec
union Azure.ResourceManager.CommonTypes.ResourceIdentityType
```

### `Severity` {#Azure.ResourceManager.CommonTypes.Severity}

Severity of the issue.

```typespec
union Azure.ResourceManager.CommonTypes.Severity
```

### `SkuTier` {#Azure.ResourceManager.CommonTypes.SkuTier}

This field is required to be implemented by the Resource Provider if the service has more than one tier, but is not required on a PUT.

```typespec
union Azure.ResourceManager.CommonTypes.SkuTier
```

### `SystemAssignedServiceIdentityType` {#Azure.ResourceManager.CommonTypes.SystemAssignedServiceIdentityType}

Type of managed service identity (either system assigned, or none).

```typespec
union Azure.ResourceManager.CommonTypes.SystemAssignedServiceIdentityType
```

## Azure.ResourceManager.Foundations

### `ArmTagsProperty` {#Azure.ResourceManager.Foundations.ArmTagsProperty}

Standard type definition for Azure Resource Manager Tags property.

It is included in the TrackedResource template definition.
The Azure Resource Manager Resource tags.

```typespec
model Azure.ResourceManager.Foundations.ArmTagsProperty
```

#### Properties

| Name  | Type             | Description    |
| ----- | ---------------- | -------------- |
| tags? | `Record<string>` | Resource tags. |

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

| Name              | Type        | Description                                                            |
| ----------------- | ----------- | ---------------------------------------------------------------------- |
| apiVersion        | `string`    | The API version to use for this operation.                             |
| subscriptionId    | `Core.uuid` | The ID of the target subscription. The value must be an UUID.          |
| location          | `string`    | The location name.                                                     |
| resourceGroupName | `string`    | The name of the resource group. The name is case insensitive.          |
| resourceUri       | `string`    | The fully qualified Azure Resource manager identifier of the resource. |

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
| provider    | `"Microsoft.ThisWillBeReplaced"` |                                                                        |

### `LocationBaseParameters` {#Azure.ResourceManager.Foundations.LocationBaseParameters}

The static parameters for a location-based resource

```typespec
model Azure.ResourceManager.Foundations.LocationBaseParameters
```

#### Properties

| Name           | Type        | Description                                                   |
| -------------- | ----------- | ------------------------------------------------------------- |
| apiVersion     | `string`    | The API version to use for this operation.                    |
| subscriptionId | `Core.uuid` | The ID of the target subscription. The value must be an UUID. |
| location       | `string`    | The location name.                                            |

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

| Name           | Type                             | Description                                                   |
| -------------- | -------------------------------- | ------------------------------------------------------------- |
| apiVersion     | `string`                         | The API version to use for this operation.                    |
| subscriptionId | `Core.uuid`                      | The ID of the target subscription. The value must be an UUID. |
| location       | `string`                         | The location name.                                            |
| provider       | `"Microsoft.ThisWillBeReplaced"` |                                                               |

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

### `ResourceGroupBaseParameters` {#Azure.ResourceManager.Foundations.ResourceGroupBaseParameters}

The static parameters for a resource-group based resource

```typespec
model Azure.ResourceManager.Foundations.ResourceGroupBaseParameters
```

#### Properties

| Name              | Type        | Description                                                   |
| ----------------- | ----------- | ------------------------------------------------------------- |
| apiVersion        | `string`    | The API version to use for this operation.                    |
| subscriptionId    | `Core.uuid` | The ID of the target subscription. The value must be an UUID. |
| resourceGroupName | `string`    | The name of the resource group. The name is case insensitive. |

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
| subscriptionId    | `Core.uuid`                      | The ID of the target subscription. The value must be an UUID.          |
| location          | `string`                         | The location name.                                                     |
| resourceGroupName | `string`                         | The name of the resource group. The name is case insensitive.          |
| resourceUri       | `string`                         | The fully qualified Azure Resource manager identifier of the resource. |
| provider          | `"Microsoft.ThisWillBeReplaced"` |                                                                        |

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

| Name        | Type                                                                              | Description                                         |
| ----------- | --------------------------------------------------------------------------------- | --------------------------------------------------- |
| properties? | `ResourceManager.Foundations.ResourceUpdateModelProperties<Resource, Properties>` | The resource-specific properties for this resource. |

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

### `SubscriptionBaseParameters` {#Azure.ResourceManager.Foundations.SubscriptionBaseParameters}

The static parameters for a subscription based resource

```typespec
model Azure.ResourceManager.Foundations.SubscriptionBaseParameters
```

#### Properties

| Name           | Type        | Description                                                   |
| -------------- | ----------- | ------------------------------------------------------------- |
| apiVersion     | `string`    | The API version to use for this operation.                    |
| subscriptionId | `Core.uuid` | The ID of the target subscription. The value must be an UUID. |

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

| Name           | Type                             | Description                                                   |
| -------------- | -------------------------------- | ------------------------------------------------------------- |
| apiVersion     | `string`                         | The API version to use for this operation.                    |
| subscriptionId | `Core.uuid`                      | The ID of the target subscription. The value must be an UUID. |
| provider       | `"Microsoft.ThisWillBeReplaced"` |                                                               |

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
| provider   | `"Microsoft.ThisWillBeReplaced"` |                                            |

## Azure.ResourceManager.Legacy

### `ManagedServiceIdentityV4` {#Azure.ResourceManager.Legacy.ManagedServiceIdentityV4}

Managed service identity (system assigned and/or user assigned identities)

```typespec
model Azure.ResourceManager.Legacy.ManagedServiceIdentityV4
```

#### Properties

| Name                    | Type                                                                                                    | Description                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| principalId?            | `Core.uuid`                                                                                             | The service principal ID of the system assigned identity. This property will only be provided for a system assigned identity. |
| tenantId?               | `Core.uuid`                                                                                             | The tenant ID of the system assigned identity. This property will only be provided for a system assigned identity.            |
| type                    | [`ManagedServiceIdentityType`](./data-types.md#Azure.ResourceManager.Legacy.ManagedServiceIdentityType) | The type of managed identity assigned to this resource.                                                                       |
| userAssignedIdentities? | `Record<ResourceManager.CommonTypes.UserAssignedIdentity>`                                              | The identities assigned to this resource by the user.                                                                         |

### `ManagedServiceIdentityV4Property` {#Azure.ResourceManager.Legacy.ManagedServiceIdentityV4Property}

Model representing the standard `ManagedServiceIdentity` envelope property from V4 of common type.

Please note that this is only included for legacy specs with mixed v3 and v4 types, which would cause
breaking changes due to the ManagedServiceIdentityType.SystemAndUserAssigned value changes.

Do not use this if you are already on CommonTypes.Version.v4 or beyond.

```typespec
model Azure.ResourceManager.Legacy.ManagedServiceIdentityV4Property
```

#### Examples

```typespec
model Foo is TrackedResource<FooProperties> {
  ...ResourceNameParameter<Foo>;
  ...Legacy.ManagedServiceIdentityV4Property;
}
```

#### Properties

| Name      | Type                                                                                                | Description                                               |
| --------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| identity? | [`ManagedServiceIdentityV4`](./data-types.md#Azure.ResourceManager.Legacy.ManagedServiceIdentityV4) | The managed service identities assigned to this resource. |

### `ManagedServiceIdentityType` {#Azure.ResourceManager.Legacy.ManagedServiceIdentityType}

Type of managed service identity (where both SystemAssigned and UserAssigned types are allowed).

```typespec
union Azure.ResourceManager.Legacy.ManagedServiceIdentityType
```
