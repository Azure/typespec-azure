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

Instantiate `Azure.Core.ResourceOperations` with your service traits and use its operation
templates as building blocks for your APIs:

```typespec
alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;
op createOrReplace is Operations.ResourceCreateOrReplace<Resource>;
```

See [Defining standard resource operations](../../getstarted/azure-core/step04.md) for the
service traits and interface definition. Prefer `ResourceCreateOrReplace` and
`LongRunningResourceCreateOrReplace` for new PUT APIs. The legacy PATCH templates
`ResourceCreateOrUpdate`, `LongRunningResourceCreateOrUpdate`, and `ResourceUpdate` use
deprecated implicit optionality and are not recommended for new APIs. For partial updates,
define a custom PATCH operation with an explicit request model; do not change an existing
PATCH API to PUT without considering its API and SDK contracts.

In the following table, `TResource` is the resource model and `Traits` customizes operation
traits. Templates are members of your `ResourceOperations` instance.

| Operation                                                            | Notes                                                 |
| -------------------------------------------------------------------- | ----------------------------------------------------- |
| ResourceCreateOrReplace<TResource, Traits>                          | Resource PUT operation.                               |
| ResourceCreateWithServiceProvidedName<TResource, Traits>            | Resource POST operation.                              |
| ResourceRead<TResource, Traits>                                     | Resource GET operation.                               |
| ResourceDelete<TResource, Traits>                                   | Resource DELETE operation.                            |
| ResourceList<TResource, Traits>                                     | Resource LIST operation with server-driven paging.    |
| ResourceAction<TResource, TParams, TResponse>                        | Perform a custom action on a specific resource.       |
| ResourceCollectionAction<TResource, TParams, TResponse>              | Perform a custom action on a collection of resources. |
| LongRunningResourceCreateOrReplace<TResource, Traits>               | Long-running resource PUT operation.                  |
| LongRunningResourceCreateWithServiceProvidedName<TResource, Traits> | Long-running resource POST operation.                 |
| LongRunningResourceDelete<TResource, Traits>                        | Long-running resource DELETE operation.               |

### Decorators

The `@azure-tools/typespec-azure-core` library defines the following decorators:

| Declarator         | Scope                      | Usage                                                                                                   |
| ------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------- |
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
