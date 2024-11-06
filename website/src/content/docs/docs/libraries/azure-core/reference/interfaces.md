---
title: "Interfaces and Operations"
---

## Azure.Core

### `ResourceOperations` {#Azure.Core.ResourceOperations}

Interface containing common resource operations.

```typespec
interface Azure.Core.ResourceOperations<InterfaceTraits, ErrorResponse>
```

#### Template Parameters

| Name            | Description                                                                             |
| --------------- | --------------------------------------------------------------------------------------- |
| InterfaceTraits | Traits applicable to the operations.                                                    |
| ErrorResponse   | Error response of the operations. If not specified, the default error response is used. |

#### `ResourceOperations.ResourceCreateOrReplace` {#Azure.Core.ResourceOperations.ResourceCreateOrReplace}

Create or replace operation template.

```typespec
op Azure.Core.ResourceOperations.ResourceCreateOrReplace(apiVersion: string, resource: Resource): Azure.Core.Foundations.{ statusCode: 201 } | Azure.Core.Foundations.{ statusCode: 200 } | ErrorResponse
```

##### Template Parameters

| Name     | Description                                    |
| -------- | ---------------------------------------------- |
| Resource | Resource type.                                 |
| Traits   | Object describing the traits of the operation. |

#### `ResourceOperations.LongRunningResourceCreateOrReplace` {#Azure.Core.ResourceOperations.LongRunningResourceCreateOrReplace}

Long-running resource create or replace operation template.

```typespec
op Azure.Core.ResourceOperations.LongRunningResourceCreateOrReplace(apiVersion: string, resource: Resource): Azure.Core.Foundations.{ statusCode: 201, operationLocation: TypeSpec.Rest.ResourceLocation } | Azure.Core.Foundations.{ statusCode: 200, operationLocation: TypeSpec.Rest.ResourceLocation } | ErrorResponse
```

##### Template Parameters

| Name     | Description                                    |
| -------- | ---------------------------------------------- |
| Resource | Resource type.                                 |
| Traits   | Object describing the traits of the operation. |

#### `ResourceOperations.ResourceCreateOrUpdate` {#Azure.Core.ResourceOperations.ResourceCreateOrUpdate}

Create or update operation template.

```typespec
op Azure.Core.ResourceOperations.ResourceCreateOrUpdate(apiVersion: string, contentType: "application/merge-patch+json", resource: Resource): Azure.Core.Foundations.{ statusCode: 201 } | Azure.Core.Foundations.{ statusCode: 200 } | ErrorResponse
```

##### Template Parameters

| Name     | Description                                    |
| -------- | ---------------------------------------------- |
| Resource | Resource type.                                 |
| Traits   | Object describing the traits of the operation. |

#### `ResourceOperations.LongRunningResourceCreateOrUpdate` {#Azure.Core.ResourceOperations.LongRunningResourceCreateOrUpdate}

Long-running resource create or update operation template.

```typespec
op Azure.Core.ResourceOperations.LongRunningResourceCreateOrUpdate(apiVersion: string, contentType: "application/merge-patch+json", resource: Resource): Azure.Core.Foundations.{ statusCode: 201, operationLocation: TypeSpec.Rest.ResourceLocation } | Azure.Core.Foundations.{ statusCode: 200, operationLocation: TypeSpec.Rest.ResourceLocation } | ErrorResponse
```

##### Template Parameters

| Name     | Description                                    |
| -------- | ---------------------------------------------- |
| Resource | Resource type.                                 |
| Traits   | Object describing the traits of the operation. |

#### `ResourceOperations.ResourceUpdate` {#Azure.Core.ResourceOperations.ResourceUpdate}

Resource update operation template.

```typespec
op Azure.Core.ResourceOperations.ResourceUpdate(apiVersion: string, contentType: "application/merge-patch+json", resource: Resource): Azure.Core.Foundations.{ statusCode: 200 } | ErrorResponse
```

##### Template Parameters

| Name     | Description                                    |
| -------- | ---------------------------------------------- |
| Resource | Resource type.                                 |
| Traits   | Object describing the traits of the operation. |

#### `ResourceOperations.ResourceCreateWithServiceProvidedName` {#Azure.Core.ResourceOperations.ResourceCreateWithServiceProvidedName}

Resource create with service-provided name operation template.

```typespec
op Azure.Core.ResourceOperations.ResourceCreateWithServiceProvidedName(apiVersion: string, resource: Resource): Azure.Core.{ statusCode: 201, location: TypeSpec.Rest.ResourceLocation } | ErrorResponse
```

##### Template Parameters

| Name     | Description                                    |
| -------- | ---------------------------------------------- |
| Resource | Resource type.                                 |
| Traits   | Object describing the traits of the operation. |

#### `ResourceOperations.LongRunningResourceCreateWithServiceProvidedName` {#Azure.Core.ResourceOperations.LongRunningResourceCreateWithServiceProvidedName}

Long-running resource create with service-provided name operation template.

```typespec
op Azure.Core.ResourceOperations.LongRunningResourceCreateWithServiceProvidedName(apiVersion: string, resource: Resource): Azure.Core.{ statusCode: 202, location: TypeSpec.Rest.ResourceLocation } | ErrorResponse
```

##### Template Parameters

| Name     | Description                                    |
| -------- | ---------------------------------------------- |
| Resource | Resource type.                                 |
| Traits   | Object describing the traits of the operation. |

#### `ResourceOperations.ResourceRead` {#Azure.Core.ResourceOperations.ResourceRead}

Resource read operation template.

```typespec
op Azure.Core.ResourceOperations.ResourceRead(apiVersion: string): {} | ErrorResponse
```

##### Template Parameters

| Name     | Description                                    |
| -------- | ---------------------------------------------- |
| Resource | Resource type.                                 |
| Traits   | Object describing the traits of the operation. |

#### `ResourceOperations.ResourceDelete` {#Azure.Core.ResourceOperations.ResourceDelete}

Resource delete operation template.

```typespec
op Azure.Core.ResourceOperations.ResourceDelete(apiVersion: string): Azure.Core.{ statusCode: 204 } | ErrorResponse
```

##### Template Parameters

| Name     | Description                                    |
| -------- | ---------------------------------------------- |
| Resource | Resource type.                                 |
| Traits   | Object describing the traits of the operation. |

#### `ResourceOperations.LongRunningResourceDelete` {#Azure.Core.ResourceOperations.LongRunningResourceDelete}

Long-running resource delete operation template.

```typespec
op Azure.Core.ResourceOperations.LongRunningResourceDelete(apiVersion: string): Azure.Core.Foundations.{ statusCode: 202, id: string, status: Azure.Core.Foundations.OperationState, error: Azure.Core.Foundations.Error, result: never, operationLocation: TypeSpec.Rest.ResourceLocation } | ErrorResponse
```

##### Template Parameters

| Name     | Description                                    |
| -------- | ---------------------------------------------- |
| Resource | Resource type.                                 |
| Traits   | Object describing the traits of the operation. |

#### `ResourceOperations.ResourceList` {#Azure.Core.ResourceOperations.ResourceList}

Resource list operation template.

```typespec
op Azure.Core.ResourceOperations.ResourceList(apiVersion: string): Azure.Core.Foundations.CustomPage<Resource, Traits> | ErrorResponse
```

##### Template Parameters

| Name     | Description                                    |
| -------- | ---------------------------------------------- |
| Resource | Resource type.                                 |
| Traits   | Object describing the traits of the operation. |

#### `ResourceOperations.ResourceAction` {#Azure.Core.ResourceOperations.ResourceAction}

Resource action operation template.

```typespec
op Azure.Core.ResourceOperations.ResourceAction(apiVersion: string): {} | ErrorResponse
```

##### Template Parameters

| Name       | Description                                        |
| ---------- | -------------------------------------------------- |
| Resource   | Resource type.                                     |
| Parameters | Object describing the parameters of the operation. |
| Response   | Object describing the response of the operation.   |
| Traits     | Object describing the traits of the operation.     |

#### `ResourceOperations.ResourceCollectionAction` {#Azure.Core.ResourceOperations.ResourceCollectionAction}

Resource collection action operation template.

```typespec
op Azure.Core.ResourceOperations.ResourceCollectionAction(apiVersion: string): {} | ErrorResponse
```

##### Template Parameters

| Name       | Description                                        |
| ---------- | -------------------------------------------------- |
| Resource   | Resource type.                                     |
| Parameters | Object describing the parameters of the operation. |
| Response   | Object describing the response of the operation.   |
| Traits     | Object describing the traits of the operation.     |

#### `ResourceOperations.LongRunningResourceAction` {#Azure.Core.ResourceOperations.LongRunningResourceAction}

Long-running resource action operation template.

```typespec
op Azure.Core.ResourceOperations.LongRunningResourceAction(apiVersion: string): Azure.Core.{ statusCode: 202, id: string, status: Azure.Core.Foundations.OperationState, error: StatusError, result: StatusResult, operationLocation: TypeSpec.Rest.ResourceLocation } | ErrorResponse
```

##### Template Parameters

| Name         | Description                                           |
| ------------ | ----------------------------------------------------- |
| Resource     | Resource type.                                        |
| Parameters   | Object describing the parameters of the operation.    |
| StatusResult | Object describing the status result of the operation. |
| StatusError  | Object describing the status error of the operation.  |
| Traits       | Object describing the traits of the operation.        |

#### `ResourceOperations.LongRunningResourceCollectionAction` {#Azure.Core.ResourceOperations.LongRunningResourceCollectionAction}

Long-running resource collection action operation template.

```typespec
op Azure.Core.ResourceOperations.LongRunningResourceCollectionAction(apiVersion: string): Azure.Core.{ statusCode: 202, id: string, status: Azure.Core.Foundations.OperationState, error: StatusError, result: StatusResult, operationLocation: TypeSpec.Rest.ResourceLocation } | ErrorResponse
```

##### Template Parameters

| Name         | Description                                           |
| ------------ | ----------------------------------------------------- |
| Resource     | Resource type.                                        |
| Parameters   | Object describing the parameters of the operation.    |
| StatusResult | Object describing the status result of the operation. |
| StatusError  | Object describing the status error of the operation.  |
| Traits       | Object describing the traits of the operation.        |

#### `ResourceOperations.GetResourceOperationStatus` {#Azure.Core.ResourceOperations.GetResourceOperationStatus}

Resource operation status operation template.

```typespec
op Azure.Core.ResourceOperations.GetResourceOperationStatus(apiVersion: string): Azure.Core.ResourceOperationStatus<Resource, StatusResult, StatusError> | ErrorResponse
```

##### Template Parameters

| Name         | Description                                           |
| ------------ | ----------------------------------------------------- |
| Resource     | Resource type.                                        |
| StatusResult | Object describing the status result of the operation. |
| StatusError  | Object describing the status error of the operation.  |
| Traits       | Object describing the traits of the operation.        |

### `GetResourceOperationStatus` {#Azure.Core.GetResourceOperationStatus}

Operation signature to retrieve a resource operation status.

```typespec
op Azure.Core.GetResourceOperationStatus(apiVersion: string): Azure.Core.ResourceOperationStatus<Resource, StatusResult, StatusError> | Azure.Core.Foundations.ErrorResponse
```

#### Template Parameters

| Name         | Description                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| Resource     | The type of the resource.                                                                             |
| StatusResult | Object describing the result of the status operation.                                                 |
| StatusError  | Object describing the error of the status operation. If not provided, the default error type is used. |
| Traits       | Traits to apply to the operation.                                                                     |

### `LongRunningResourceAction` {#Azure.Core.LongRunningResourceAction}

DEPRECATED: Use `LongRunningResourceAction` from a `ResourceOperations` interface instance.
This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.

Long-running operation signature for a resource action.

```typespec
op Azure.Core.LongRunningResourceAction(apiVersion: string): Azure.Core.{ statusCode: 202, id: string, status: Azure.Core.Foundations.OperationState, error: StatusError, result: StatusResult, operationLocation: TypeSpec.Rest.ResourceLocation } | Azure.Core.Foundations.ErrorResponse
```

#### Template Parameters

| Name         | Description                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| Resource     | The type of the resource.                                                                             |
| Parameters   | Object describing the request parameters.                                                             |
| StatusResult | Object describing the result of the status operation.                                                 |
| StatusError  | Object describing the error of the status operation. If not provided, the default error type is used. |
| Traits       | Traits to apply to the operation.                                                                     |

### `LongRunningResourceCollectionAction` {#Azure.Core.LongRunningResourceCollectionAction}

DEPRECATED: Use `LongRunningResourceCollectionAction` from a `ResourceOperations` interface instance.
This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.

Long-running operation signature for an action that applies to a collection of resources.

```typespec
op Azure.Core.LongRunningResourceCollectionAction(apiVersion: string): Azure.Core.{ statusCode: 202, id: string, status: Azure.Core.Foundations.OperationState, error: StatusError, result: StatusResult, operationLocation: TypeSpec.Rest.ResourceLocation } | Azure.Core.Foundations.ErrorResponse
```

#### Template Parameters

| Name         | Description                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| Resource     | The type of the resource.                                                                             |
| Parameters   | Object describing the request parameters.                                                             |
| StatusResult | Object describing the result of the status operation.                                                 |
| StatusError  | Object describing the error of the status operation. If not provided, the default error type is used. |
| Traits       | Traits to apply to the operation.                                                                     |

### `LongRunningResourceCreateOrReplace` {#Azure.Core.LongRunningResourceCreateOrReplace}

:::warning
**Deprecated**: Use `LongRunningResourceCreateOrReplace` from a `ResourceOperations` interface instance.
:::

DEPRECATED: Use `LongRunningResourceCreateOrReplace` from a `ResourceOperations` interface instance.
This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.

Long-running operation signature to create or replace a resource.

```typespec
op Azure.Core.LongRunningResourceCreateOrReplace(apiVersion: string, resource: Resource): Azure.Core.Foundations.{ statusCode: 201, operationLocation: TypeSpec.Rest.ResourceLocation } | Azure.Core.Foundations.{ statusCode: 200, operationLocation: TypeSpec.Rest.ResourceLocation } | Azure.Core.Foundations.ErrorResponse
```

#### Template Parameters

| Name     | Description                       |
| -------- | --------------------------------- |
| Resource | The type of the resource.         |
| Traits   | Traits to apply to the operation. |

### `LongRunningResourceCreateOrUpdate` {#Azure.Core.LongRunningResourceCreateOrUpdate}

:::warning
**Deprecated**: Use `LongRunningResourceCreateOrUpdate` from a `ResourceOperations` interface instance.
:::

DEPRECATED: Use `LongRunningResourceCreateOrUpdate` from a `ResourceOperations` interface instance.
This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.

Long-running operation signature to create or update a resource.

```typespec
op Azure.Core.LongRunningResourceCreateOrUpdate(apiVersion: string, contentType: "application/merge-patch+json", resource: Resource): Azure.Core.Foundations.{ statusCode: 201, operationLocation: TypeSpec.Rest.ResourceLocation } | Azure.Core.Foundations.{ statusCode: 200, operationLocation: TypeSpec.Rest.ResourceLocation } | Azure.Core.Foundations.ErrorResponse
```

#### Template Parameters

| Name     | Description                       |
| -------- | --------------------------------- |
| Resource | The type of the resource.         |
| Traits   | Traits to apply to the operation. |

### `LongRunningResourceCreateWithServiceProvidedName` {#Azure.Core.LongRunningResourceCreateWithServiceProvidedName}

:::warning
**Deprecated**: Use `LongRunningResourceCreateWithServiceProvidedName` from a `ResourceOperations` interface instance.
:::

DEPRECATED: Use `LongRunningResourceCreateWithServiceProvidedName` from a `ResourceOperations` interface instance.
This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.

Long-running operation signature to create a resource with a service-provided name.

```typespec
op Azure.Core.LongRunningResourceCreateWithServiceProvidedName(apiVersion: string, resource: Resource): Azure.Core.{ statusCode: 202, location: TypeSpec.Rest.ResourceLocation } | Azure.Core.Foundations.ErrorResponse
```

#### Template Parameters

| Name     | Description                       |
| -------- | --------------------------------- |
| Resource | The type of the resource.         |
| Traits   | Traits to apply to the operation. |

### `LongRunningResourceDelete` {#Azure.Core.LongRunningResourceDelete}

DEPRECATED: Use `LongRunningResourceDelete` from a `ResourceOperations` interface instance.
This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.

Long-running operation signature to delete a resource.

```typespec
op Azure.Core.LongRunningResourceDelete(apiVersion: string): Azure.Core.Foundations.{ statusCode: 202, id: string, status: Azure.Core.Foundations.OperationState, error: Azure.Core.Foundations.Error, result: never, operationLocation: TypeSpec.Rest.ResourceLocation } | Azure.Core.Foundations.ErrorResponse
```

#### Template Parameters

| Name     | Description                       |
| -------- | --------------------------------- |
| Resource | The type of the resource.         |
| Traits   | Traits to apply to the operation. |

### `LongRunningRpcOperation` {#Azure.Core.LongRunningRpcOperation}

A long-running remote procedure call (RPC) operation.

```typespec
op Azure.Core.LongRunningRpcOperation(apiVersion: string): Azure.Core.{ statusCode: 202, id: string, status: Azure.Core.Foundations.OperationState, error: StatusError, result: StatusResult, operationLocation: TypeSpec.Rest.ResourceLocation } | ErrorResponse
```

#### Template Parameters

| Name          | Description                                                                                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parameters    | Object describing the parameters of the operation.                                                                                                                                       |
| Response      | Object describing the response of the operation.                                                                                                                                         |
| StatusResult  | Object describing the status result of the operation.                                                                                                                                    |
| StatusError   | Error response of the status operation. If not specified, the default error response is used.                                                                                            |
| Traits        | Object describing the traits of the operation.                                                                                                                                           |
| ErrorResponse | Error response of the operation. If not specified, the default error response is used.                                                                                                   |
| TraitContexts | Trait contexts applicable to the operation. Defaults to `TraitContext.Undefined` which means that only traits that always apply will appear. Can specify multiple using the \| operator. |

### `ResourceAction` {#Azure.Core.ResourceAction}

DEPRECATED: Use `ResourceAction` from a `ResourceOperations` interface instance.
This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.

Operation signature for a resource action.

```typespec
op Azure.Core.ResourceAction(apiVersion: string): {} | Azure.Core.Foundations.ErrorResponse
```

#### Template Parameters

| Name       | Description                                |
| ---------- | ------------------------------------------ |
| Resource   | The type of the resource.                  |
| Parameters | Object describing the request parameters.  |
| Response   | Object describing the response parameters. |
| Traits     | Traits to apply to the operation.          |

### `ResourceCollectionAction` {#Azure.Core.ResourceCollectionAction}

DEPRECATED: Use `ResourceCollectionAction` from a `ResourceOperations` interface instance.
This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.

Operation signature for an action that applies to a collection of resources.

```typespec
op Azure.Core.ResourceCollectionAction(apiVersion: string): {} | Azure.Core.Foundations.ErrorResponse
```

#### Template Parameters

| Name       | Description                                |
| ---------- | ------------------------------------------ |
| Resource   | The type of the resource.                  |
| Parameters | Object describing the request parameters.  |
| Response   | Object describing the response parameters. |
| Traits     | Traits to apply to the operation.          |

### `ResourceCreateOrReplace` {#Azure.Core.ResourceCreateOrReplace}

:::warning
**Deprecated**: Use `ResourceCreateOrReplace` from a `ResourceOperations` interface instance.
:::

DEPRECATED: Use `ResourceCreateOrReplace` from a `ResourceOperations` interface instance.
This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.

Operation signature to create or replace a resource.

```typespec
op Azure.Core.ResourceCreateOrReplace(apiVersion: string, resource: Resource): Azure.Core.Foundations.{ statusCode: 201 } | Azure.Core.Foundations.{ statusCode: 200 } | Azure.Core.Foundations.ErrorResponse
```

#### Template Parameters

| Name     | Description                       |
| -------- | --------------------------------- |
| Resource | The type of the resource.         |
| Traits   | Traits to apply to the operation. |

### `ResourceCreateOrUpdate` {#Azure.Core.ResourceCreateOrUpdate}

:::warning
**Deprecated**: Use `LongRunningResourceCreateOrReplace` from a `ResourceOperations` interface instance.
:::

DEPRECATED: Use `ResourceCreateOrUpdate` from a `ResourceOperations` interface instance.
This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.

Operation signature to create or update a resource.

```typespec
op Azure.Core.ResourceCreateOrUpdate(apiVersion: string, contentType: "application/merge-patch+json", resource: Resource): Azure.Core.Foundations.{ statusCode: 201 } | Azure.Core.Foundations.{ statusCode: 200 } | Azure.Core.Foundations.ErrorResponse
```

#### Template Parameters

| Name     | Description                       |
| -------- | --------------------------------- |
| Resource | The type of the resource.         |
| Traits   | Traits to apply to the operation. |

### `ResourceCreateWithServiceProvidedName` {#Azure.Core.ResourceCreateWithServiceProvidedName}

:::warning
**Deprecated**: Use `ResourceCreateWithServiceProvidedName` from a `ResourceOperations` interface instance.
:::

DEPRECATED: Use `ResourceCreateWithServiceProvidedName` from a `ResourceOperations` interface instance.
This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.

Operation signature to synchronously create a resource with a service-provided name.

```typespec
op Azure.Core.ResourceCreateWithServiceProvidedName(apiVersion: string, resource: Resource): Azure.Core.{ statusCode: 201, location: TypeSpec.Rest.ResourceLocation } | Azure.Core.Foundations.ErrorResponse
```

#### Template Parameters

| Name     | Description                       |
| -------- | --------------------------------- |
| Resource | The type of the resource.         |
| Traits   | Traits to apply to the operation. |

### `ResourceDelete` {#Azure.Core.ResourceDelete}

DEPRECATED: Use `ResourceDelete` from a `ResourceOperations` interface instance.
This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.

Operation signature to delete a resource.

```typespec
op Azure.Core.ResourceDelete(apiVersion: string): Azure.Core.{ statusCode: 204 } | Azure.Core.Foundations.ErrorResponse
```

#### Template Parameters

| Name     | Description                       |
| -------- | --------------------------------- |
| Resource | The type of the resource.         |
| Traits   | Traits to apply to the operation. |

### `ResourceList` {#Azure.Core.ResourceList}

DEPRECATED: Use `ResourceList` from a `ResourceOperations` interface instance.
This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.

Operation signature to list resources in a paginated way.

```typespec
op Azure.Core.ResourceList(apiVersion: string): Azure.Core.Foundations.CustomPage<Resource, Traits> | Azure.Core.Foundations.ErrorResponse
```

#### Template Parameters

| Name     | Description                       |
| -------- | --------------------------------- |
| Resource | The type of the resource.         |
| Traits   | Traits to apply to the operation. |

### `ResourceRead` {#Azure.Core.ResourceRead}

DEPRECATED: Use `ResourceRead` from a `ResourceOperations` interface instance.
This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.

Operation signature to retrieve a resource.

```typespec
op Azure.Core.ResourceRead(apiVersion: string): {} | Azure.Core.Foundations.ErrorResponse
```

#### Template Parameters

| Name     | Description                       |
| -------- | --------------------------------- |
| Resource | The type of the resource.         |
| Traits   | Traits to apply to the operation. |

### `ResourceUpdate` {#Azure.Core.ResourceUpdate}

:::warning
**Deprecated**: Use `ResourceUpdate` from a `ResourceOperations` interface instance.
:::

DEPRECATED: Use `ResourceUpdate` from a `ResourceOperations` interface instance.
This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
Operation signature to update a resource.

```typespec
op Azure.Core.ResourceUpdate(apiVersion: string, contentType: "application/merge-patch+json", resource: Resource): Azure.Core.Foundations.{ statusCode: 200 } | Azure.Core.Foundations.ErrorResponse
```

#### Template Parameters

| Name     | Description                       |
| -------- | --------------------------------- |
| Resource | The type of the resource.         |
| Traits   | Traits to apply to the operation. |

### `RpcOperation` {#Azure.Core.RpcOperation}

A remote procedure call (RPC) operation.

```typespec
op Azure.Core.RpcOperation(apiVersion: string): {} | ErrorResponse
```

#### Template Parameters

| Name          | Description                                                                                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parameters    | Object describing the parameters of the operation.                                                                                                                                       |
| Response      | Object describing the response of the operation.                                                                                                                                         |
| Traits        | Object describing the traits of the operation.                                                                                                                                           |
| ErrorResponse | Error response of the operation. If not specified, the default error response is used.                                                                                                   |
| TraitContexts | Trait contexts applicable to the operation. Defaults to `TraitContext.Undefined` which means that only traits that always apply will appear. Can specify multiple using the \| operator. |

## Azure.Core.Foundations

### `GetOperationStatus` {#Azure.Core.Foundations.GetOperationStatus}

Operation that returns the status of another operation.

```typespec
op Azure.Core.Foundations.GetOperationStatus(apiVersion: string, operationId: string): Azure.Core.Foundations.OperationStatus<StatusResult, StatusError> | ErrorResponse
```

#### Template Parameters

| Name          | Description                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Parameters    | Object describing the request parameters of the operation.                                     |
| StatusResult  | The type of the operation status result.                                                       |
| StatusError   | The type of the operation status error.                                                        |
| Traits        | Traits which apply to the operation.                                                           |
| ErrorResponse | The type of the error response. If not provided, the default error response type will be used. |

### `LongRunningOperation` {#Azure.Core.Foundations.LongRunningOperation}

Long-running operation.

```typespec
op Azure.Core.Foundations.LongRunningOperation(apiVersion: string): Azure.Core.Foundations.{ operationLocation: TypeSpec.Rest.ResourceLocation } | ErrorResponse
```

#### Template Parameters

| Name          | Description                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| Parameters    | Object describing the request parameters of the operation.                                                           |
| Response      | Object describing the response properties of the operation. If not provided, the AcceptedResponse type will be used. |
| Traits        | Traits which apply to the operation.                                                                                 |
| ErrorResponse | The type of the error response. If not provided, the default error response type will be used.                       |

### `LongRunningResourceUpdate` {#Azure.Core.Foundations.LongRunningResourceUpdate}

Long-running operation that updates a resource.

```typespec
op Azure.Core.Foundations.LongRunningResourceUpdate(apiVersion: string, contentType: "application/merge-patch+json", resource: Resource): Azure.Core.Foundations.{ statusCode: 200, operationLocation: TypeSpec.Rest.ResourceLocation } | ErrorResponse
```

#### Template Parameters

| Name          | Description                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Resource      | The type of the resource.                                                                      |
| Traits        | Traits which apply to the operation.                                                           |
| ErrorResponse | The type of the error response. If not provided, the default error response type will be used. |

### `NonPagedResourceList` {#Azure.Core.Foundations.NonPagedResourceList}

Operation that lists resources in a non-paginated way.

```typespec
op Azure.Core.Foundations.NonPagedResourceList(apiVersion: string): Azure.Core.Foundations.{ body: Array<Element> } | ErrorResponse
```

#### Template Parameters

| Name          | Description                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Resource      | The type of the resource.                                                                      |
| Traits        | Traits which apply to the operation.                                                           |
| ErrorResponse | The type of the error response. If not provided, the default error response type will be used. |

### `Operation` {#Azure.Core.Foundations.Operation}

The most basic operation.

```typespec
op Azure.Core.Foundations.Operation(apiVersion: string): Response | ErrorResponse
```

#### Template Parameters

| Name          | Description                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Parameters    | Object describing the request parameters of the operation.                                     |
| Response      | Object describing the response properties of the operation.                                    |
| Traits        | Traits which apply to the operation.                                                           |
| ErrorResponse | The type of the error response. If not provided, the default error response type will be used. |

### `ResourceCollectionOperation` {#Azure.Core.Foundations.ResourceCollectionOperation}

Operation that applies to a collection of resources.

```typespec
op Azure.Core.Foundations.ResourceCollectionOperation(apiVersion: string): Response | ErrorResponse
```

#### Template Parameters

| Name          | Description                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Resource      | The type of the resource.                                                                      |
| Parameters    | Object describing the request parameters of the operation.                                     |
| Response      | Object describing the response properties of the operation.                                    |
| Traits        | Traits which apply to the operation.                                                           |
| ErrorResponse | The type of the error response. If not provided, the default error response type will be used. |

### `ResourceList` {#Azure.Core.Foundations.ResourceList}

Operation that lists resources in a paginated way.

```typespec
op Azure.Core.Foundations.ResourceList(apiVersion: string): Response | ErrorResponse
```

#### Template Parameters

| Name          | Description                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Resource      | The type of the resource.                                                                      |
| Parameters    | Object describing the request parameters of the operation.                                     |
| Response      | Object describing the response properties of the operation.                                    |
| Traits        | Traits which apply to the operation.                                                           |
| ErrorResponse | The type of the error response. If not provided, the default error response type will be used. |

### `ResourceOperation` {#Azure.Core.Foundations.ResourceOperation}

The most basic operation that applies to a resource.

```typespec
op Azure.Core.Foundations.ResourceOperation(apiVersion: string): Response | ErrorResponse
```

#### Template Parameters

| Name          | Description                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Resource      | The type of the resource.                                                                      |
| Parameters    | Object describing the request parameters of the operation.                                     |
| Response      | Object describing the response properties of the operation.                                    |
| Traits        | Traits which apply to the operation.                                                           |
| ErrorResponse | The type of the error response. If not provided, the default error response type will be used. |
