---
title: Library Tour
---

The `@azure-tools/typespec-azure-core` library defines the following artifacts:

- TypeSpec Azure Core Library
  - [Models](#models)
  - [Operations](#operations)
  - [Decorators](#decorators)
  - [API](#api)

### Models

The `@azure-tools/typespec-azure-core` library defines the following models:

| Model                 | Notes                                                                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page<TResource\>      | Model for a paged resource. `<TResource>` is the model description of the item.                                                                                                                   |
| PagedResultMetadata   | Contains the metadata associated with a `Page<TResource>`.                                                                                                                                        |
| RequestParameter<T\>  | For long-running operations, identifies that a continuation operation request parameter is pulled from the original request. `<T>` is the property name on the original request.                  |
| ResponseProperty<T\>  | For long-running operations, identifies that a continuation operation request parameter is pulled from the response of the previous request. `<T>` is the property name on the previous response. |
| LongRunningStates     | Identifies the long-running states associated with a long-running operation.                                                                                                                      |
| OperationLinkMetadata | Contains the metadata associated with an operation link.                                                                                                                                          |

### Operations

The `@azure-tools/typespec-azure-core` library defines these standard operation templates as basic building blocks that you can expose. You can use `is` to compose the operations to meet the exact needs of your APIs.

For all of these operation templates, `TResource` is the resource model and `TCustom` allows customization of the operation parameters or response. `TCustom`, if provided, must extend the `Azure.Core.Foundations.CustomizationFields` model, which looks like:

```typespec
@doc("The expected shape of model types passed to the TCustom parameter of operation signatures.")
model CustomizationFields {
  @doc("An object containing custom parameters that will be included in the operation.")
  parameters?: object;

  @doc("An object containing custom properties that will be included in the response.")
  response?: object;
}
```

| Operation                                                            | Notes                                                 |
| -------------------------------------------------------------------- | ----------------------------------------------------- |
| ResourceCreateOrUpdate<TResource, TCustom>                           | Resource PATCH operation.                             |
| ResourceCreateOrReplace<TResource, TCustom>                          | Resource PUT operation.                               |
| ResourceCreateWithServiceProvidedName<TResource, TCustom>            | Resource POST operation.                              |
| ResourceRead<TResource, TCustom>                                     | Resource GET operation.                               |
| ResourceDelete<TResource, TCustom>                                   | Resource DELETE operation.                            |
| ResourceList<TResource, TCustom>                                     | Resource LIST operation with server-driven paging.    |
| NonPagedResourceList<TResource, TCustom>                             | Resource LIST operation without paging.               |
| ResourceAction<TResource, TParams, TResponse>                        | Perform a custom action on a specific resource.       |
| ResourceCollectionAction<TResource, TParams, TResponse>              | Perform a custom action on a collection of resources. |
| LongRunningResourceCreateOrReplace<TResource, TCustom>               | Long-running resource PUT operation.                  |
| LongRunningResourceCreateOrUpdate<TResource, TCustom>                | Long-running resource PATCH operation.                |
| LongRunningResourceCreateWithServiceProvidedName<TResource, TCustom> | Long-running resource POST operation.                 |
| LongRunningResourceDelete<TResource, TCustom>                        | Long-running resource DELETE operation.               |

### Decorators

The `@azure-tools/typespec-azure-core` library defines the following decorators:

| Declarator         | Scope                      | Usage                                                                                                   |
| ------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| @pagedResult       | models                     | indicates model describes a paged result.                                                               |
| @items             | model properties           | indicates model property that stores the items within a paged result.                                   |
| @nextLink          | model properties           | indicates model property that contains the continuation information for the next page.                  |
| @nextPageOperation | operations                 | indicates operation that will be called for subsequent page requests.                                   |
| @lroStatus         | enums and model properties | indicates model or model property that represents long-running operation status.                        |
| @lroSucceeded      | enum members               | indicates enum member that corresponds to the long-running operation succeeded status.                  |
| @lroCanceled       | enum members               | indicates enum member that corresponds to the long-running operation canceled status.                   |
| @lroFailed         | enum members               | indicates enum member that corresponds to the long-running operation failed status.                     |
| @pollingLocation   | model properties           | indicates model property that contains the location to poll for operation state.                        |
| @finalLocation     | model properties           | indicates model property that contains the final location for the operation result.                     |
| @operationLink     | operations                 | indicates operation that is linked to the decorated operation by virtue of its `linkType`.              |
| @pollingOperation  | operations                 | indicates an operation is a polling operation for a long-running operation.                             |
| @finalOperation    | operations                 | indicates an operation is the final operation for a long-running operation.                             |

### API

The `@azure-tools/typespec-azure-core` library defines the following API functions that emitter authors can use for development:

| Name                 | Entity                             | Returns                             | Description                                                                                          |
| -------------------- | ---------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| getPagedResult       | models and operations              | PagedResultMetadata?                | Returns the `PagedResultMetadata` if associated with a model or operation return type.               |
| getItems             | model properties                   | boolean                             | Returns `true` if the model property is annotated with `@items`.                                     |
| getNextLink          | model properties                   | boolean                             | Returns `true` if the model property is annotated with `@nextLink`.                                  |
| getLongRunningStates | enums, models and model properties | LongRunningStates?                  | Returns the `LongRunningStates` associated with an entity.                                           |
| isLroSucceededState  | enum members                       | boolean                             | Returns `true` if the enum member represents a "succeeded" state.                                    |
| isLroCanceledState   | enum members                       | boolean                             | Returns `true` if the enum member represents a "canceled" state.                                     |
| isLroFailedState     | enum members                       | boolean                             | Returns `true` if the enum member represents a "failed" state.                                       |
| isPollingLocation    | model properties                   | boolean                             | Returns `true` if the model property is annotated with `@pollingLocation`.                           |
| isFinalLocation      | model properties                   | boolean                             | Returns `true` if the model property is annotated with `@finalLocation`.                             |
| getOperationLink     | operations                         | OperationLinkMetadata?              | Returns the `OperationLinkMetadata` for an operation with a specific `linkType`.                     |
| getOperationLinks    | operations                         | Map<string, OperationLinkMetadata>? | Returns a `Map` of `OperationLinkMetadata` objects for an Operation where the key is the `linkType`. |
