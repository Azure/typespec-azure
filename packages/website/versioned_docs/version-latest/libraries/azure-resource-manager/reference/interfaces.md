---
title: "Interfaces and Operations"
toc_min_heading_level: 2
toc_max_heading_level: 3
---

# Interfaces and Operations

## Azure.ResourceManager

### `ExtensionResourceCollectionOperations` {#Azure.ResourceManager.ExtensionResourceCollectionOperations}

A composite interface for resource collections that include a paginated list operation.

```typespec
interface Azure.ResourceManager.ExtensionResourceCollectionOperations<TResource>
```

#### Template Parameters

| Name      | Description                                    |
| --------- | ---------------------------------------------- |
| TResource | The ArmResource that provides these operations |

#### `ExtensionResourceCollectionOperations.list` {#Azure.ResourceManager.ExtensionResourceCollectionOperations.list}

```typespec
op Azure.ResourceManager.ExtensionResourceCollectionOperations.list(apiVersion: string, resourceUri: string, provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<Azure.ResourceManager.ResourceListResult<TResource>> | Azure.ResourceManager.ErrorResponse
```

### `ExtensionResourceInstanceOperations` {#Azure.ResourceManager.ExtensionResourceInstanceOperations}

A composite interface for resources that includes CRUD operations.

```typespec
interface Azure.ResourceManager.ExtensionResourceInstanceOperations<TResource, TProperties>
```

#### Template Parameters

| Name        | Description                                    |
| ----------- | ---------------------------------------------- |
| TResource   | The ArmResource that provides these operations |
| TProperties | RP-specific property bag for the resource      |

#### `ExtensionResourceInstanceOperations.get` {#Azure.ResourceManager.ExtensionResourceInstanceOperations.get}

```typespec
op Azure.ResourceManager.ExtensionResourceInstanceOperations.get(apiVersion: string, resourceUri: string, provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ErrorResponse
```

#### `ExtensionResourceInstanceOperations.createOrUpdate` {#Azure.ResourceManager.ExtensionResourceInstanceOperations.createOrUpdate}

```typespec
op Azure.ResourceManager.ExtensionResourceInstanceOperations.createOrUpdate(apiVersion: string, resourceUri: string, provider: Microsoft.ThisWillBeReplaced, resource: TResource): Azure.ResourceManager.ArmResourceUpdatedResponse<TResource> | Azure.ResourceManager.ArmResourceCreatedResponse<TResource> | Azure.ResourceManager.ErrorResponse
```

#### `ExtensionResourceInstanceOperations.update` {#Azure.ResourceManager.ExtensionResourceInstanceOperations.update}

```typespec
op Azure.ResourceManager.ExtensionResourceInstanceOperations.update(apiVersion: string, resourceUri: string, provider: Microsoft.ThisWillBeReplaced, properties: Azure.ResourceManager.Foundations.ResourceUpdateModel<TResource, TProperties>): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ErrorResponse
```

#### `ExtensionResourceInstanceOperations.delete` {#Azure.ResourceManager.ExtensionResourceInstanceOperations.delete}

```typespec
op Azure.ResourceManager.ExtensionResourceInstanceOperations.delete(apiVersion: string, resourceUri: string, provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmDeletedResponse | Azure.ResourceManager.ArmDeleteAcceptedLroResponse | Azure.ResourceManager.ArmDeletedNoContentResponse | Azure.ResourceManager.ErrorResponse
```

### `ExtensionResourceOperations` {#Azure.ResourceManager.ExtensionResourceOperations}

A composite interface for resources that include CRUD and list operations.

```typespec
interface Azure.ResourceManager.ExtensionResourceOperations<TResource, TProperties>
```

#### Template Parameters

| Name        | Description                                    |
| ----------- | ---------------------------------------------- |
| TResource   | The ArmResource that provides these operations |
| TProperties | RP-specific property bag for the resource      |

#### `ExtensionResourceOperations.get` {#Azure.ResourceManager.ExtensionResourceOperations.get}

```typespec
op Azure.ResourceManager.ExtensionResourceOperations.get(apiVersion: string, resourceUri: string, provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ErrorResponse
```

#### `ExtensionResourceOperations.createOrUpdate` {#Azure.ResourceManager.ExtensionResourceOperations.createOrUpdate}

```typespec
op Azure.ResourceManager.ExtensionResourceOperations.createOrUpdate(apiVersion: string, resourceUri: string, provider: Microsoft.ThisWillBeReplaced, resource: TResource): Azure.ResourceManager.ArmResourceUpdatedResponse<TResource> | Azure.ResourceManager.ArmResourceCreatedResponse<TResource> | Azure.ResourceManager.ErrorResponse
```

#### `ExtensionResourceOperations.update` {#Azure.ResourceManager.ExtensionResourceOperations.update}

```typespec
op Azure.ResourceManager.ExtensionResourceOperations.update(apiVersion: string, resourceUri: string, provider: Microsoft.ThisWillBeReplaced, properties: Azure.ResourceManager.Foundations.ResourceUpdateModel<TResource, TProperties>): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ErrorResponse
```

#### `ExtensionResourceOperations.delete` {#Azure.ResourceManager.ExtensionResourceOperations.delete}

```typespec
op Azure.ResourceManager.ExtensionResourceOperations.delete(apiVersion: string, resourceUri: string, provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmDeletedResponse | Azure.ResourceManager.ArmDeleteAcceptedLroResponse | Azure.ResourceManager.ArmDeletedNoContentResponse | Azure.ResourceManager.ErrorResponse
```

#### `ExtensionResourceOperations.list` {#Azure.ResourceManager.ExtensionResourceOperations.list}

```typespec
op Azure.ResourceManager.ExtensionResourceOperations.list(apiVersion: string, resourceUri: string, provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<Azure.ResourceManager.ResourceListResult<TResource>> | Azure.ResourceManager.ErrorResponse
```

### `Operations` {#Azure.ResourceManager.Operations}

This is the interface that implements the standard ARM operation that returns
all supported RP operations. You should have exactly one declaration for each
ARM service. It implements
GET "/providers/Microsoft.ContosoProviderHub/operations"

```typespec
interface Azure.ResourceManager.Operations<>
```

#### `Operations.list` {#Azure.ResourceManager.Operations.list}

List the operations for the provider

```typespec
op Azure.ResourceManager.Operations.list(apiVersion: string, provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<Azure.ResourceManager.Foundations.OperationListResult> | Azure.ResourceManager.ErrorResponse
```

### `ProxyResourceOperations` {#Azure.ResourceManager.ProxyResourceOperations}

A composite interface for Proxy resources that include `ResourceInstanceOperations<TResource, TProperties>`
and `ResourceListByParent<TResource>`. It includes: `GET`, `PUT`, `PATCH`, `DELETE`, ListByParent operations.

The actual route depends on the resource model but would have started with
`/subscriptions/{id}/resourcegroups/{rg}/providers/Microsoft.XXX/...`

This is the most common API pattern for Proxy Resources to use.

```typespec
interface Azure.ResourceManager.ProxyResourceOperations<TResource, TBaseParameters>
```

#### Template Parameters

| Name            | Description                                      |
| --------------- | ------------------------------------------------ |
| TResource       | the ArmResource that provides these operations   |
| TBaseParameters | The http parameters that are part of the request |

#### `ProxyResourceOperations.get` {#Azure.ResourceManager.ProxyResourceOperations.get}

```typespec
op Azure.ResourceManager.ProxyResourceOperations.get(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ErrorResponse
```

#### `ProxyResourceOperations.createOrUpdate` {#Azure.ResourceManager.ProxyResourceOperations.createOrUpdate}

```typespec
op Azure.ResourceManager.ProxyResourceOperations.createOrUpdate(provider: Microsoft.ThisWillBeReplaced, resource: TResource): Azure.ResourceManager.ArmResourceUpdatedResponse<TResource> | Azure.ResourceManager.ArmResourceCreatedResponse<TResource> | Azure.ResourceManager.ErrorResponse
```

#### `ProxyResourceOperations.delete` {#Azure.ResourceManager.ProxyResourceOperations.delete}

```typespec
op Azure.ResourceManager.ProxyResourceOperations.delete(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmDeletedResponse | Azure.ResourceManager.ArmDeleteAcceptedLroResponse | Azure.ResourceManager.ArmDeletedNoContentResponse | Azure.ResourceManager.ErrorResponse
```

#### `ProxyResourceOperations.listByResourceGroup` {#Azure.ResourceManager.ProxyResourceOperations.listByResourceGroup}

```typespec
op Azure.ResourceManager.ProxyResourceOperations.listByResourceGroup(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<Azure.ResourceManager.ResourceListResult<TResource>> | Azure.ResourceManager.ErrorResponse
```

### `ResourceCollectionOperations` {#Azure.ResourceManager.ResourceCollectionOperations}

A composite interface for resource collections.

```typespec
interface Azure.ResourceManager.ResourceCollectionOperations<TResource, TBaseParameters>
```

#### Template Parameters

| Name            | Description                                      |
| --------------- | ------------------------------------------------ |
| TResource       | The ArmResource that provides these operations   |
| TBaseParameters | The http parameters that are part of the request |

#### `ResourceCollectionOperations.listByResourceGroup` {#Azure.ResourceManager.ResourceCollectionOperations.listByResourceGroup}

```typespec
op Azure.ResourceManager.ResourceCollectionOperations.listByResourceGroup(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<Azure.ResourceManager.ResourceListResult<TResource>> | Azure.ResourceManager.ErrorResponse
```

#### `ResourceCollectionOperations.listBySubscription` {#Azure.ResourceManager.ResourceCollectionOperations.listBySubscription}

```typespec
op Azure.ResourceManager.ResourceCollectionOperations.listBySubscription(apiVersion: string, subscriptionId: string, provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<Azure.ResourceManager.ResourceListResult<TResource>> | Azure.ResourceManager.ErrorResponse
```

### `ResourceCreateAsync` {#Azure.ResourceManager.ResourceCreateAsync}

A composite interface for resources that include a long-running create or update operation.

```typespec
interface Azure.ResourceManager.ResourceCreateAsync<TResource, TBaseParameters>
```

#### Template Parameters

| Name            | Description                                      |
| --------------- | ------------------------------------------------ |
| TResource       | The ArmResource that provides these operations   |
| TBaseParameters | The http parameters that are part of the request |

#### `ResourceCreateAsync.createOrUpdate` {#Azure.ResourceManager.ResourceCreateAsync.createOrUpdate}

```typespec
op Azure.ResourceManager.ResourceCreateAsync.createOrUpdate(provider: Microsoft.ThisWillBeReplaced, resource: TResource): Azure.ResourceManager.ArmResourceUpdatedResponse<TResource> | Azure.ResourceManager.ArmResourceCreatedResponse<TResource> | Azure.ResourceManager.ErrorResponse
```

### `ResourceCreateSync` {#Azure.ResourceManager.ResourceCreateSync}

A composite interface for resources that include a synchronous create or update operation.

```typespec
interface Azure.ResourceManager.ResourceCreateSync<TResource, TBaseParameters>
```

#### Template Parameters

| Name            | Description                                      |
| --------------- | ------------------------------------------------ |
| TResource       | The ArmResource that provides these operations   |
| TBaseParameters | The http parameters that are part of the request |

#### `ResourceCreateSync.createOrUpdate` {#Azure.ResourceManager.ResourceCreateSync.createOrUpdate}

```typespec
op Azure.ResourceManager.ResourceCreateSync.createOrUpdate(provider: Microsoft.ThisWillBeReplaced, resource: TResource): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ErrorResponse
```

### `ResourceDeleteAsync` {#Azure.ResourceManager.ResourceDeleteAsync}

```typespec
interface Azure.ResourceManager.ResourceDeleteAsync<TResource, TBaseParameters>
```

#### Template Parameters

| Name            | Description                                      |
| --------------- | ------------------------------------------------ |
| TResource       | The ArmResource that provides these operations   |
| TBaseParameters | The http parameters that are part of the request |

#### `ResourceDeleteAsync.delete` {#Azure.ResourceManager.ResourceDeleteAsync.delete}

```typespec
op Azure.ResourceManager.ResourceDeleteAsync.delete(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmDeletedResponse | Azure.ResourceManager.ArmDeleteAcceptedLroResponse | Azure.ResourceManager.ArmDeletedNoContentResponse | Azure.ResourceManager.ErrorResponse
```

### `ResourceDeleteSync` {#Azure.ResourceManager.ResourceDeleteSync}

A composite interface for resources that include a synchronous delete operation.

```typespec
interface Azure.ResourceManager.ResourceDeleteSync<TResource, TBaseParameters>
```

#### Template Parameters

| Name            | Description                                      |
| --------------- | ------------------------------------------------ |
| TResource       | The ArmResource that provides these operations   |
| TBaseParameters | The http parameters that are part of the request |

#### `ResourceDeleteSync.delete` {#Azure.ResourceManager.ResourceDeleteSync.delete}

```typespec
op Azure.ResourceManager.ResourceDeleteSync.delete(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmDeletedResponse | Azure.ResourceManager.ArmDeletedNoContentResponse | Azure.ResourceManager.ErrorResponse
```

### `ResourceDeleteWithoutOkAsync` {#Azure.ResourceManager.ResourceDeleteWithoutOkAsync}

```typespec
interface Azure.ResourceManager.ResourceDeleteWithoutOkAsync<TResource, TBaseParameters>
```

#### Template Parameters

| Name            | Description                                      |
| --------------- | ------------------------------------------------ |
| TResource       | The ArmResource that provides these operations   |
| TBaseParameters | The http parameters that are part of the request |

#### `ResourceDeleteWithoutOkAsync.delete` {#Azure.ResourceManager.ResourceDeleteWithoutOkAsync.delete}

```typespec
op Azure.ResourceManager.ResourceDeleteWithoutOkAsync.delete(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmDeleteAcceptedLroResponse | Azure.ResourceManager.ArmDeletedNoContentResponse | Azure.ResourceManager.ErrorResponse
```

### `ResourceInstanceOperations` {#Azure.ResourceManager.ResourceInstanceOperations}

A composite interface for resources that have CRUD operations.

```typespec
interface Azure.ResourceManager.ResourceInstanceOperations<TResource, TProperties, TBaseParameters, TPatchModel>
```

#### Template Parameters

| Name            | Description                                      |
| --------------- | ------------------------------------------------ |
| TResource       | The ArmResource that provides these operations   |
| TProperties     | RP-specific property bag for the resource        |
| TBaseParameters | The http parameters that are part of the request |
| TPatchModel     | The model used for PATCH operations              |

#### `ResourceInstanceOperations.get` {#Azure.ResourceManager.ResourceInstanceOperations.get}

```typespec
op Azure.ResourceManager.ResourceInstanceOperations.get(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ErrorResponse
```

#### `ResourceInstanceOperations.createOrUpdate` {#Azure.ResourceManager.ResourceInstanceOperations.createOrUpdate}

```typespec
op Azure.ResourceManager.ResourceInstanceOperations.createOrUpdate(provider: Microsoft.ThisWillBeReplaced, resource: TResource): Azure.ResourceManager.ArmResourceUpdatedResponse<TResource> | Azure.ResourceManager.ArmResourceCreatedResponse<TResource> | Azure.ResourceManager.ErrorResponse
```

#### `ResourceInstanceOperations.update` {#Azure.ResourceManager.ResourceInstanceOperations.update}

```typespec
op Azure.ResourceManager.ResourceInstanceOperations.update(provider: Microsoft.ThisWillBeReplaced, properties: Azure.ResourceManager.Foundations.ResourceUpdateModel<TResource, TProperties>): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ErrorResponse
```

#### `ResourceInstanceOperations.delete` {#Azure.ResourceManager.ResourceInstanceOperations.delete}

```typespec
op Azure.ResourceManager.ResourceInstanceOperations.delete(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmDeletedResponse | Azure.ResourceManager.ArmDeleteAcceptedLroResponse | Azure.ResourceManager.ArmDeletedNoContentResponse | Azure.ResourceManager.ErrorResponse
```

### `ResourceListByParent` {#Azure.ResourceManager.ResourceListByParent}

An interface for resources which can be listed by parent.

```typespec
interface Azure.ResourceManager.ResourceListByParent<TResource, TBaseParameters, TParentName, TParentFriendlyName>
```

#### Template Parameters

| Name                | Description                                      |
| ------------------- | ------------------------------------------------ |
| TResource           | The ArmResource that provides these operations   |
| TBaseParameters     | The http parameters that are part of the request |
| TParentName         | The name of the parent resource                  |
| TParentFriendlyName | The friendly name of the parent resource         |

#### `ResourceListByParent.listByParent` {#Azure.ResourceManager.ResourceListByParent.listByParent}

```typespec
op Azure.ResourceManager.ResourceListByParent.listByParent(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<Azure.ResourceManager.ResourceListResult<TResource>> | Azure.ResourceManager.ErrorResponse
```

### `ResourceListBySubscription` {#Azure.ResourceManager.ResourceListBySubscription}

An interface for resources with can be listed by subscription.

```typespec
interface Azure.ResourceManager.ResourceListBySubscription<TResource>
```

#### Template Parameters

| Name      | Description                                    |
| --------- | ---------------------------------------------- |
| TResource | The ArmResource that provides these operations |

#### `ResourceListBySubscription.listBySubscription` {#Azure.ResourceManager.ResourceListBySubscription.listBySubscription}

```typespec
op Azure.ResourceManager.ResourceListBySubscription.listBySubscription(apiVersion: string, subscriptionId: string, provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<Azure.ResourceManager.ResourceListResult<TResource>> | Azure.ResourceManager.ErrorResponse
```

### `ResourceOperations` {#Azure.ResourceManager.ResourceOperations}

```typespec
interface Azure.ResourceManager.ResourceOperations<TResource, TProperties, TBaseParameters>
```

#### Template Parameters

| Name            | Description                                      |
| --------------- | ------------------------------------------------ |
| TResource       | the ArmResource that provides these operations   |
| TProperties     | RP-specific property bag for the resource        |
| TBaseParameters | The http parameters that are part of the request |

#### `ResourceOperations.get` {#Azure.ResourceManager.ResourceOperations.get}

```typespec
op Azure.ResourceManager.ResourceOperations.get(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ErrorResponse
```

#### `ResourceOperations.createOrUpdate` {#Azure.ResourceManager.ResourceOperations.createOrUpdate}

```typespec
op Azure.ResourceManager.ResourceOperations.createOrUpdate(provider: Microsoft.ThisWillBeReplaced, resource: TResource): Azure.ResourceManager.ArmResourceUpdatedResponse<TResource> | Azure.ResourceManager.ArmResourceCreatedResponse<TResource> | Azure.ResourceManager.ErrorResponse
```

#### `ResourceOperations.update` {#Azure.ResourceManager.ResourceOperations.update}

```typespec
op Azure.ResourceManager.ResourceOperations.update(provider: Microsoft.ThisWillBeReplaced, properties: Azure.ResourceManager.Foundations.ResourceUpdateModel<TResource, TProperties>): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ErrorResponse
```

#### `ResourceOperations.delete` {#Azure.ResourceManager.ResourceOperations.delete}

```typespec
op Azure.ResourceManager.ResourceOperations.delete(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmDeletedResponse | Azure.ResourceManager.ArmDeleteAcceptedLroResponse | Azure.ResourceManager.ArmDeletedNoContentResponse | Azure.ResourceManager.ErrorResponse
```

#### `ResourceOperations.listByResourceGroup` {#Azure.ResourceManager.ResourceOperations.listByResourceGroup}

```typespec
op Azure.ResourceManager.ResourceOperations.listByResourceGroup(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<Azure.ResourceManager.ResourceListResult<TResource>> | Azure.ResourceManager.ErrorResponse
```

#### `ResourceOperations.listBySubscription` {#Azure.ResourceManager.ResourceOperations.listBySubscription}

```typespec
op Azure.ResourceManager.ResourceOperations.listBySubscription(apiVersion: string, subscriptionId: string, provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<Azure.ResourceManager.ResourceListResult<TResource>> | Azure.ResourceManager.ErrorResponse
```

### `ResourceRead` {#Azure.ResourceManager.ResourceRead}

A composite interface for resources that include a GET operation.

```typespec
interface Azure.ResourceManager.ResourceRead<TResource, TBaseParameters>
```

#### Template Parameters

| Name            | Description                                      |
| --------------- | ------------------------------------------------ |
| TResource       | The ArmResource that provides these operations   |
| TBaseParameters | The http parameters that are part of the request |

#### `ResourceRead.get` {#Azure.ResourceManager.ResourceRead.get}

```typespec
op Azure.ResourceManager.ResourceRead.get(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ErrorResponse
```

### `ResourceUpdateAsync` {#Azure.ResourceManager.ResourceUpdateAsync}

```typespec
interface Azure.ResourceManager.ResourceUpdateAsync<TResource, TProperties, TBaseParameters>
```

#### Template Parameters

| Name            | Description                                      |
| --------------- | ------------------------------------------------ |
| TResource       | The ArmResource that provides these operations   |
| TProperties     | RP-specific property bag for the resource        |
| TBaseParameters | The http parameters that are part of the request |

#### `ResourceUpdateAsync.update` {#Azure.ResourceManager.ResourceUpdateAsync.update}

```typespec
op Azure.ResourceManager.ResourceUpdateAsync.update(provider: Microsoft.ThisWillBeReplaced, properties: Azure.ResourceManager.Foundations.ResourceUpdateModel<TResource, TProperties>): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ArmAcceptedLroResponse<Resource update request accepted.> | Azure.ResourceManager.ErrorResponse
```

### `ResourceUpdateSync` {#Azure.ResourceManager.ResourceUpdateSync}

A composite interface for resources that include a synchronous update operation.

```typespec
interface Azure.ResourceManager.ResourceUpdateSync<TResource, TProperties, TBaseParameters>
```

#### Template Parameters

| Name            | Description                                      |
| --------------- | ------------------------------------------------ |
| TResource       | The ArmResource that provides these operations   |
| TProperties     | RP-specific property bag for the resource        |
| TBaseParameters | The http parameters that are part of the request |

#### `ResourceUpdateSync.update` {#Azure.ResourceManager.ResourceUpdateSync.update}

```typespec
op Azure.ResourceManager.ResourceUpdateSync.update(provider: Microsoft.ThisWillBeReplaced, properties: Azure.ResourceManager.Foundations.ResourceUpdateModel<TResource, TProperties>): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ErrorResponse
```

### `TenantResourceOperations` {#Azure.ResourceManager.TenantResourceOperations}

A composite interface for Tenant resources that include `ResourceInstanceOperations<TResource, TProperties>`
and `ResourceListByParent<TResource>`. It includes: `GET`, `PUT`, `PATCH`, `DELETE`, ListByParent operations.

The routes are always start at root level:
`/providers/Microsoft.XXX/...`

This is the most common API pattern for Tenant Resources to use.

```typespec
interface Azure.ResourceManager.TenantResourceOperations<TResource, TProperties>
```

#### Template Parameters

| Name        | Description                                    |
| ----------- | ---------------------------------------------- |
| TResource   | the ArmResource that provides these operations |
| TProperties | RP-specific property bag for the resource      |

#### `TenantResourceOperations.get` {#Azure.ResourceManager.TenantResourceOperations.get}

```typespec
op Azure.ResourceManager.TenantResourceOperations.get(apiVersion: string, provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ErrorResponse
```

#### `TenantResourceOperations.createOrUpdate` {#Azure.ResourceManager.TenantResourceOperations.createOrUpdate}

```typespec
op Azure.ResourceManager.TenantResourceOperations.createOrUpdate(apiVersion: string, provider: Microsoft.ThisWillBeReplaced, resource: TResource): Azure.ResourceManager.ArmResourceUpdatedResponse<TResource> | Azure.ResourceManager.ArmResourceCreatedResponse<TResource> | Azure.ResourceManager.ErrorResponse
```

#### `TenantResourceOperations.update` {#Azure.ResourceManager.TenantResourceOperations.update}

```typespec
op Azure.ResourceManager.TenantResourceOperations.update(apiVersion: string, provider: Microsoft.ThisWillBeReplaced, properties: Azure.ResourceManager.Foundations.ResourceUpdateModel<TResource, TProperties>): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ErrorResponse
```

#### `TenantResourceOperations.delete` {#Azure.ResourceManager.TenantResourceOperations.delete}

```typespec
op Azure.ResourceManager.TenantResourceOperations.delete(apiVersion: string, provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmDeletedResponse | Azure.ResourceManager.ArmDeleteAcceptedLroResponse | Azure.ResourceManager.ArmDeletedNoContentResponse | Azure.ResourceManager.ErrorResponse
```

#### `TenantResourceOperations.listByTenant` {#Azure.ResourceManager.TenantResourceOperations.listByTenant}

```typespec
op Azure.ResourceManager.TenantResourceOperations.listByTenant(apiVersion: string, provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<Azure.ResourceManager.ResourceListResult<TResource>> | Azure.ResourceManager.ErrorResponse
```

### `TrackedResourceOperations` {#Azure.ResourceManager.TrackedResourceOperations}

A composite interface for resources that include `ResourceInstanceOperations<TResource, TProperties>`
and `ResourceCollectionOperations<TResource>`. It includes: `GET`, `PUT`, `PATCH`, `DELETE`, ListByParent,
ListBySubscription operations. The actual route depends on the resource model.
This is the most common API pattern for Tracked Resources to use.

```typespec
interface Azure.ResourceManager.TrackedResourceOperations<TResource, TProperties, TBaseParameters>
```

#### Template Parameters

| Name            | Description                                      |
| --------------- | ------------------------------------------------ |
| TResource       | the ArmResource that provides these operations   |
| TProperties     | RP-specific property bag for the resource        |
| TBaseParameters | The http parameters that are part of the request |

#### `TrackedResourceOperations.get` {#Azure.ResourceManager.TrackedResourceOperations.get}

```typespec
op Azure.ResourceManager.TrackedResourceOperations.get(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ErrorResponse
```

#### `TrackedResourceOperations.createOrUpdate` {#Azure.ResourceManager.TrackedResourceOperations.createOrUpdate}

```typespec
op Azure.ResourceManager.TrackedResourceOperations.createOrUpdate(provider: Microsoft.ThisWillBeReplaced, resource: TResource): Azure.ResourceManager.ArmResourceUpdatedResponse<TResource> | Azure.ResourceManager.ArmResourceCreatedResponse<TResource> | Azure.ResourceManager.ErrorResponse
```

#### `TrackedResourceOperations.update` {#Azure.ResourceManager.TrackedResourceOperations.update}

```typespec
op Azure.ResourceManager.TrackedResourceOperations.update(provider: Microsoft.ThisWillBeReplaced, properties: Azure.ResourceManager.Foundations.ResourceUpdateModel<TResource, TProperties>): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ErrorResponse
```

#### `TrackedResourceOperations.delete` {#Azure.ResourceManager.TrackedResourceOperations.delete}

```typespec
op Azure.ResourceManager.TrackedResourceOperations.delete(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmDeletedResponse | Azure.ResourceManager.ArmDeleteAcceptedLroResponse | Azure.ResourceManager.ArmDeletedNoContentResponse | Azure.ResourceManager.ErrorResponse
```

#### `TrackedResourceOperations.listByResourceGroup` {#Azure.ResourceManager.TrackedResourceOperations.listByResourceGroup}

```typespec
op Azure.ResourceManager.TrackedResourceOperations.listByResourceGroup(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<Azure.ResourceManager.ResourceListResult<TResource>> | Azure.ResourceManager.ErrorResponse
```

#### `TrackedResourceOperations.listBySubscription` {#Azure.ResourceManager.TrackedResourceOperations.listBySubscription}

```typespec
op Azure.ResourceManager.TrackedResourceOperations.listBySubscription(apiVersion: string, subscriptionId: string, provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<Azure.ResourceManager.ResourceListResult<TResource>> | Azure.ResourceManager.ErrorResponse
```

### `ArmCustomPatchAsync` {#Azure.ResourceManager.ArmCustomPatchAsync}

A long-running resource update using a custom PATCH payload (Asynchronous)

```typespec
op Azure.ResourceManager.ArmCustomPatchAsync(provider: Microsoft.ThisWillBeReplaced, properties: TPatchModel): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ArmAcceptedLroResponse<Resource update request accepted.> | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name            | Description                                          |
| --------------- | ---------------------------------------------------- |
| TResource       | the resource being patched                           |
| TPatchModel     | The input model for the PATCH request                |
| TBaseParameters | Optional. Allows overriding the operation parameters |

### `ArmCustomPatchSync` {#Azure.ResourceManager.ArmCustomPatchSync}

A resource update using a custom PATCH payload (synchronous)

```typespec
op Azure.ResourceManager.ArmCustomPatchSync(provider: Microsoft.ThisWillBeReplaced, properties: TPatchModel): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name            | Description                                          |
| --------------- | ---------------------------------------------------- |
| TResource       | the resource being patched                           |
| TPatchModel     | The input model for the PATCH request                |
| TBaseParameters | Optional. Allows overriding the operation parameters |

### `ArmListBySubscription` {#Azure.ResourceManager.ArmListBySubscription}

A resource list operation, at the subscription scope

```typespec
op Azure.ResourceManager.ArmListBySubscription(apiVersion: string, subscriptionId: string, provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<Azure.ResourceManager.ResourceListResult<TResource>> | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name      | Description                |
| --------- | -------------------------- |
| TResource | the resource being patched |

### `ArmResourceActionAsync` {#Azure.ResourceManager.ArmResourceActionAsync}

A long-running resource action.

```typespec
op Azure.ResourceManager.ArmResourceActionAsync(provider: Microsoft.ThisWillBeReplaced, body: TRequest): Azure.ResourceManager.ArmAcceptedLroResponse<Resource operation accepted.> | TResponse | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name            | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| TResource       | The resource being acted upon                                |
| TRequest        | The request model for the action                             |
| TResponse       | The response model for the action                            |
| TBaseParameters | Optional. Allows overriding the parameters for the operation |

### `ArmResourceActionAsyncBase` {#Azure.ResourceManager.ArmResourceActionAsyncBase}

A long-running resource action.

```typespec
op Azure.ResourceManager.ArmResourceActionAsyncBase(provider: Microsoft.ThisWillBeReplaced, body: TRequest): TResponse | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name            | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| TResource       | The resource being acted upon                                |
| TRequest        | The request model for the action                             |
| TResponse       | The response type for the action                             |
| TBaseParameters | Optional. Allows overriding the parameters for the operation |

### `ArmResourceActionNoContentAsync` {#Azure.ResourceManager.ArmResourceActionNoContentAsync}

A long-running resource action that returns no content. DEPRECATED: Use 'ArmResourceActionNoResponseContentAsync' instead

```typespec
op Azure.ResourceManager.ArmResourceActionNoContentAsync(provider: Microsoft.ThisWillBeReplaced, body: TRequest): Azure.ResourceManager.ArmAcceptedLroResponse<Resource operation accepted.> | Azure.ResourceManager.ArmNoContentResponse<Action completed successfully.> | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name            | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| TResource       | The resource being acted upon                                |
| TRequest        | The request model for the action                             |
| TBaseParameters | Optional. Allows overriding the parameters for the operation |

### `ArmResourceActionNoContentSync` {#Azure.ResourceManager.ArmResourceActionNoContentSync}

A synchronous resource action that returns no content.

```typespec
op Azure.ResourceManager.ArmResourceActionNoContentSync(provider: Microsoft.ThisWillBeReplaced, body: TRequest): Azure.ResourceManager.ArmNoContentResponse<Action completed successfully.> | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name            | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| TResource       | The resource being acted upon                                |
| TRequest        | The request model for the action                             |
| TBaseParameters | Optional. Allows overriding the parameters for the operation |

### `ArmResourceActionNoResponseContentAsync` {#Azure.ResourceManager.ArmResourceActionNoResponseContentAsync}

A long-running resource action that returns no content.

```typespec
op Azure.ResourceManager.ArmResourceActionNoResponseContentAsync(provider: Microsoft.ThisWillBeReplaced, body: TRequest): Azure.ResourceManager.ArmAcceptedLroResponse<Resource operation accepted.> | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name            | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| TResource       | The resource being acted upon                                |
| TRequest        | The request model for the action                             |
| TBaseParameters | Optional. Allows overriding the parameters for the operation |

### `ArmResourceActionSync` {#Azure.ResourceManager.ArmResourceActionSync}

A synchronous resource action.

```typespec
op Azure.ResourceManager.ArmResourceActionSync(provider: Microsoft.ThisWillBeReplaced, body: TRequest): TResponse | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name            | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| TResource       | The resource being acted upon                                |
| TRequest        | The request model for the action                             |
| TResponse       | The response model for the action                            |
| TBaseParameters | Optional. Allows overriding the parameters for the operation |

### `ArmResourceCreateOrReplaceSync` {#Azure.ResourceManager.ArmResourceCreateOrReplaceSync}

Synchronous PUT operation for ARM resources

```typespec
op Azure.ResourceManager.ArmResourceCreateOrReplaceSync(provider: Microsoft.ThisWillBeReplaced, resource: TResource): Azure.ResourceManager.ArmResourceUpdatedResponse<TResource> | Azure.ResourceManager.ArmResourceCreatedSyncResponse<TResource> | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name            | Description                                          |
| --------------- | ---------------------------------------------------- |
| TResource       | the resource being patched                           |
| TBaseParameters | Optional. Allows overriding the operation parameters |

### `ArmResourceCreateOrUpdateAsync` {#Azure.ResourceManager.ArmResourceCreateOrUpdateAsync}

A long-running resource CreateOrUpdate (PUT)

```typespec
op Azure.ResourceManager.ArmResourceCreateOrUpdateAsync(provider: Microsoft.ThisWillBeReplaced, resource: TResource): Azure.ResourceManager.ArmResourceUpdatedResponse<TResource> | Azure.ResourceManager.ArmResourceCreatedResponse<TResource> | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name            | Description                                          |
| --------------- | ---------------------------------------------------- |
| TResource       | the resource being patched                           |
| TBaseParameters | Optional. Allows overriding the operation parameters |

### `ArmResourceCreateOrUpdateSync` {#Azure.ResourceManager.ArmResourceCreateOrUpdateSync}

DEPRECATED: Please use ArmResourceCreateOrReplaceSync instead

```typespec
op Azure.ResourceManager.ArmResourceCreateOrUpdateSync(provider: Microsoft.ThisWillBeReplaced, resource: TResource): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name            | Description                                          |
| --------------- | ---------------------------------------------------- |
| TResource       | the resource being patched                           |
| TBaseParameters | Optional. Allows overriding the operation parameters |

### `ArmResourceDeleteAsync` {#Azure.ResourceManager.ArmResourceDeleteAsync}

```typespec
op Azure.ResourceManager.ArmResourceDeleteAsync(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmDeletedResponse | Azure.ResourceManager.ArmDeleteAcceptedLroResponse | Azure.ResourceManager.ArmDeletedNoContentResponse | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name            | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| TResource       | The resource being deleted                                   |
| TBaseParameters | Optional. Allows overriding the parameters for the operation |

### `ArmResourceDeleteAsyncBase` {#Azure.ResourceManager.ArmResourceDeleteAsyncBase}

```typespec
op Azure.ResourceManager.ArmResourceDeleteAsyncBase(provider: Microsoft.ThisWillBeReplaced): TResponse | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name            | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| TResource       | The resource being deleted                                   |
| TResponse       | The response type for the operation                          |
| TBaseParameters | Optional. Allows overriding the parameters for the operation |

### `ArmResourceDeleteSync` {#Azure.ResourceManager.ArmResourceDeleteSync}

Delete a resource synchronously

```typespec
op Azure.ResourceManager.ArmResourceDeleteSync(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmDeletedResponse | Azure.ResourceManager.ArmDeletedNoContentResponse | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name            | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| TResource       | The resource being deleted                                   |
| TBaseParameters | Optional. Allows overriding the parameters for the operation |

### `ArmResourceDeleteWithoutOkAsync` {#Azure.ResourceManager.ArmResourceDeleteWithoutOkAsync}

```typespec
op Azure.ResourceManager.ArmResourceDeleteWithoutOkAsync(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmDeleteAcceptedLroResponse | Azure.ResourceManager.ArmDeletedNoContentResponse | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name            | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| TResource       | The resource being deleted                                   |
| TBaseParameters | Optional. Allows overriding the parameters for the operation |

### `ArmResourceListAtScope` {#Azure.ResourceManager.ArmResourceListAtScope}

A resource list operation, with scope determined by TBaseParameters

```typespec
op Azure.ResourceManager.ArmResourceListAtScope(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<Azure.ResourceManager.ResourceListResult<TResource>> | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name            | Description                                          |
| --------------- | ---------------------------------------------------- |
| TResource       | the resource being patched                           |
| TBaseParameters | Optional. Allows overriding the operation parameters |

### `ArmResourceListByParent` {#Azure.ResourceManager.ArmResourceListByParent}

A resource list operation, at the scope of the resource's parent

```typespec
op Azure.ResourceManager.ArmResourceListByParent(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<Azure.ResourceManager.ResourceListResult<TResource>> | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name                | Description                                          |
| ------------------- | ---------------------------------------------------- |
| TResource           | the resource being patched                           |
| TBaseParameters     | Optional. Allows overriding the operation parameters |
| TParentName         | Optional. The name of the parent resource            |
| TParentFriendlyName | Optional. The friendly name of the parent resource   |

### `ArmResourceRead` {#Azure.ResourceManager.ArmResourceRead}

A resource GET operation

```typespec
op Azure.ResourceManager.ArmResourceRead(provider: Microsoft.ThisWillBeReplaced): Azure.ResourceManager.ArmResponse<T> | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name            | Description                                          |
| --------------- | ---------------------------------------------------- |
| TResource       | the resource being patched                           |
| TBaseParameters | Optional. Allows overriding the operation parameters |

### `checkGlobalNameAvailability` {#Azure.ResourceManager.checkGlobalNameAvailability}

Adds check global name availability operation, normally used if
a resource name must be globally unique (for example, if the resource
exposes and endpoint that uses the resource name in the url)

```typespec
op Azure.ResourceManager.checkGlobalNameAvailability(apiVersion: string, subscriptionId: string, provider: Microsoft.ThisWillBeReplaced, body: TRequest): TResponse | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name              | Description                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------- |
| TRequest          | the availability request, defaults to the standard request, containing name and resource type |
| TResponse         | the availability response, default to the standard response                                   |
| TAdditionalParams | A model specifying additional non-path parameters to the availability request                 |

### `checkLocalNameAvailability` {#Azure.ResourceManager.checkLocalNameAvailability}

Adds check location-specific name availability operation, normally used if
a resource name must be globally unique (for example, if the resource
exposes and endpoint that uses the resource name in the url)

```typespec
op Azure.ResourceManager.checkLocalNameAvailability(apiVersion: string, subscriptionId: string, provider: Microsoft.ThisWillBeReplaced, location: string, body: TRequest): TResponse | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name              | Description                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------- |
| TRequest          | the availability request, defaults to the standard request, containing name and resource type |
| TResponse         | the availability response, default to the standard response                                   |
| TAdditionalParams | A model specifying additional non-path parameters to the availability request                 |

## Azure.ResourceManager.Foundations

### `checkNameAvailability` {#Azure.ResourceManager.Foundations.checkNameAvailability}

Adds check name availability operation, normally used if
a resource name must be globally unique (for example, if the resource
exposes an endpoint that uses the resource name in the url)

```typespec
op Azure.ResourceManager.Foundations.checkNameAvailability(apiVersion: string, body: TRequest): TResponse | Azure.ResourceManager.ErrorResponse
```

#### Template Parameters

| Name              | Description                                                              |
| ----------------- | ------------------------------------------------------------------------ |
| TScopeParameters  | A parameter model with properties representing the scope of the resource |
| TRequest          | The operation request body                                               |
| TResponse         | The operation response                                                   |
| TAdditionalParams | A parameter model with properties representing non-path parameters       |
