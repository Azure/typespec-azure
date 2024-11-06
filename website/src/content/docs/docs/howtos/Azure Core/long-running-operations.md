---
title: "Deep Dive: Long-running (Asynchronous) Operations"
---

Long-running, or asynchronous operations (LROs for short) are Http Operations that are not complete in a single request/response sequence. Such operations require multiple requests and responses, usually to different endpoints before the operation is complete. Some common patterns that services use for LROs include:

- Polling the resource 'GET' endpoint - Using a 'status' field in the resource to specify the resource state, and polling the resource Get endpoint until the status field reached a terminal status. A 'Location' header is often provided on the initial operation response, with a Url for the resource 'Get' endpoint.
- Using a Status Monitor endpoint - Defining a separate endpoint where operation status can be obtained. An 'Operation-Location' or similar header with a Url for the StatusMonitor endpoint is most often provided in the initial operation response.
- Providing a Push Notification System - Allowing the client to specify an endpoint for the service to call once the operation is complete

Note that, for many APIs, the Url of the StatusMonitor (or resource GET) endpoint can easily be determined from the values in the initial request and response. This pattern is often followed when linking operations in OpenAPI3 specifications.

## Modeling Long-running Operations in TypeSpec

The `@azure-tools/typespec-azure-core` library contains specific operation templates for long-running operation patterns recommended by the api review board. Using these templates will ensure that a service has the widest range of compatibility with Azure SDKs and Azure tooling for long-running operations. Service teams **should** use these templates to define their long-running operations. Existing services that have LROs that do not comply with API guidelines should discuss their operations with the Api review board, or the TypeSpec team.

## Long-running Operation Helpers for Emitters and Libraries

The Azure.Core library provides a helper that emitters can use to determine if an operation being processed is an LRO, and to provide details about how the LRO should be processed by clients, or about how operations are linked.

```typespec
getLroMetadata( program: Program, operation: Operation) : LroMetadata | undefined;
```

The `LroMetadata` returned from this function contains information about the linked operations and their behavior, as well as additional that clients used to processing OpenAPI2 will be able to use to process TypeSpec operations similarly:

| Property          | Description                                                                                                                                                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `logicalResponse` | contains the type of the operation response, for the long-running operation (i.e. the result after polling completes).                                                                                                                                                                  |
| `final-state-via` | contains values corresponding to the same field in the `x-ms-long-running-operation-options` extension in OpenAPI specifications.                                                                                                                                                       |
| `statusMonitor`   | contains information about the status monitor, including the status monitor type                                                                                                                                                                                                        |
| `polling`         | contains information about polling the status monitor, including the status field and terminal status values                                                                                                                                                                            |
| `final`           | contains information about how to get the result when polling completes. In the standard case. this will contain a reference to the status monitor property that contains result information. If another operation needs to be called to get the status, that information will be here. |

As indicated above, operations often contain multiple mechanisms that clients can use to resolve a long-running operation, this means that an operation will frequently contain both operation links and resource links that describe the LRO. The helper prefers the use of resource links to the use of operation links, where possible.

## Describing Custom LRO Patterns using Azure.Core

The `@azure-tools/typespec-azure-core` library also contains general structures for defining custom long-running operations using specialized model templates and decorators. The following sections describe . The primary mechanisms for linking operations are `Operation Links` and `Resource Links`.

### Custom LROs - Operation Links

Operation links are used when the input parameters to a linked operation can be determined from parameters in the initial operation request and response. For example, if a polling operation uses the identity parameters of the initial request, and an `operationId` parameter which is returned in a header or field in the response, the link between the operations should be modeled as an Operation Link. In order to use an Operation link, each parameter of the linked operation must correspond with a parameter of the initial operation, a property of the initial request (header or body), or property of the initial response (header or body). Operation links encode a reference to the linked operation, and a mapping between the initial request and response and the parameters of the linked operation:

```typespec
op getWidgetOperationStatus is getResourceOperationStatus<Widget>;

@pollingOperation(getWidgetOperationStatus, parameterMap)
op createWidgetAsync is longRunningCreateOrReplace<Widget>;
```

Note that, in the example above, the `@pollingOperation`decorator is used to specify an operation link to a StatusMonitor endpoint. This is just syntactic sugar for `@operationLink(getWidgetOperationStatus, "polling", parameterMap)`. To represent the logical stages of an LRO, `@pollingOperation` represents a link to a statusMonitor, and is the only decoration required for operations that comply with the recommended LRO pattern. Another decorator `@finalOperation` represents a link to an operation where the final result must be obtained my making a final request after polling has terminated.

#### Decorators for Operation Links in Azure.Core

Azure.Core defines the following decorators for operation links

`@pollingOperation` - links a long-running operation to its status monitor endpoint.
`@finalOperation` - links a long-running operation to an additional endpoint, in the case that an additional endpoint must be called to obtain the final result after polling the status monitor is complete.

Each of these decorators require a reference to the linked operation. They may also provide a mapping between the parameters and response properties of the initial request to the parameters of the linked operation. This mapping can be provided as a `Model` type parameter passed to the decorator, or by decorating the parameters and response properties of the original operation using `@lroParameter`

### Custom LROs - Resource Links

Resource links are used when the entire url of the linked operation is provided as part of the response to the initial operation. A resource link encodes the type of the expected response when the link is followed:

```typespec
model WidgetStatusMonitorResponse {
  @pollingLocation
  @header("Operation-Location")
  operationLocation: ResourceLocation<ResourceOperationStatus<Widget>>;
  // following the url in this header will provide a response of type ResourceOperationStatus<Widget>
}
```

#### Decorators for Resource Links in Azure.Core

Azure.Core defines the following decorators for resource links used in long-running operations:

`@pollingLocation` - indicates that the decorated property contains a url to the StatusMonitor. The type of the decorated property **should** be a `ResourceLocation`.
`@finalLocation` - indicates that the decorated property contains a url to the final result, in cases where an additional request must be made after polling to obtain the final result of the operation. The type of the decorated property must be a `ResourceLocation`.

```typespec
alias ResultHeaders = {
  @pollingLocation
  @header("Operation-Location")
  operationLocation: ResourceLocation<ResourceOperationStatus<Widget>>;

  @finalLocation
  @header("location")
  location: ResourceLocation<Widget>;
};
```

Note that the LRO templates provided in Azure.Core automatically provide the appropriate headers and resource location decoration for LROs.
Note that operations often provide multiple mechanisms that clients may use to determine how to logically complete an operation. This is often done to allow clients with different capabilities to determine how to resolve a long-running operation. It is recommended that clients prefer using Operation links in preference to Resource links whenever possible, because OperationLinks provide more information about the next operation.

### Status Monitor Types in Azure.Core

For Azure services, there is clear API guidance that requires usage of the Status Monitor pattern. In Azure, the Status Monitor has a specific structure, including:

- A 'status' property containing the current status of the operation
  - The status property is a string property that contains known values for terminal states, by default these are 'Succeeded' for successful operation termination, 'Failed' for operation termination with failure, and 'Canceled' to indicate the operation was canceled.
- A 'result' property, containing the result of the operation once the operation has succeeded (and is null if it has not succeeded)
- An 'error' property, containing any errors that occurred during the operation.

In Azure.Core, this structure is represented using the `ResourceOperationStatus<TResource, TSuccess, TError>` model. The initial response to a long-running operation in Azure must contain an `Operation-Location` header that contains a url to the StatusMonitor endpoint. The StatusMonitor endpoint Url can also be calculated using the key properties of the resource and an additional `operationId` key property. To allow repeatability of requests and automatic calculation of the statusMonitor Uri, each LRO should allow an `OperationId` header that sets the operationId for the operation id execution. The `OperationId` must also be included in a header in the initial lro response. These patterns are encoded in the `LongRunning` operation templates provided in Azure.Core. If your service description uses these templates, it will automatically be following the recommended pattern.

### Decorators and Types for Custom StatusMonitors in Azure.Core

A StatusMonitor provides information that drives client polling until an operation completes. This includes a `status` field containing the current state of the operation, with known values for terminal states, headers that suggest polling retry intervals, and fields that will contain result and error information when the operation reaches a terminal status. Azure.Core provides a `ResourceOperationStatus` template that defines the standard Azure status monitor for an Azure operation. However, some services may need to implement custom status monitors. Azure.Core provides additional decorators to help clients use custom status monitors.

| Decorator                    | Value                                                                                                                                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@lroStatus`                 | A decorator marking the field of the StatusMonitor that contains status information. This field should use a `union` type to specify terminal status values.                                                                                                              |
| `@lroResult`                 | A decorator marking the property of the Status monitor that contains the result of the operation, when the operation completes successfully. By default, any field named 'result' in a StatusMonitor is assumed to contain the result of a successful operation.          |
| `@lroErrorResult`            | A decorator marking the property of the Status monitor that contains errors when the operation is unsuccessful. By default, any field named 'error' in a StatusMonitor is assumed to contain the result of a successful operation.                                        |
| `@lroSucceeded`              | If a status monitor uses a value other than `Succeeded` to indicate operation termination with success, then the variant corresponding to successful completion should be decorated with this decorator.                                                                  |
| `@lroCanceled`               | If a status monitor uses a value other than `Canceled` to indicate that the operation was cancelled, then the variant corresponding to cancellation should be decorated with this decorator.                                                                              |
| `@lroFailed`                 | If a status monitor uses a value other than `Failed` to indicate operation termination with failure, then the variant corresponding to operation failure should be decorated with this decorator.                                                                         |
| `@pollingOperationParameter` | Indicates which request parameters or response properties of an operation can be used to call the operation that retrieves lro status (Status Monitor). Each application of the decorator may reference or name the corresponding parameter in the `getStatus` operation. |

### Examples of common (non-standard) Lro Patterns

- Status Monitor with custom terminal status fields
- Status Monitor with custom result field
- Link to StatusMonitor in the `location` header
- Link to StatusMonitor in the `Azure-AsyncOperation` header
- Link to operation with final status
- Calling GetStatusMonitor operation with non-standard parameters

#### Example 1 - Status Monitor with custom terminal status fields

In this example, the Status Monitor terminal properties for "Succeeded", "Failed", and "Canceled" use non-standard names.

```tsp
@lroStatus
union OperationStatus {
  Running: "Running",

  @lroSucceeded
  Completed: "Completed",

  @lroCanceled
  Aborted: "Aborted",

  @lroFailed
  Faulted: "Faulted",

  string,
}

model StatusMonitor {
  status: OperationStatus;
  result?: Widget;
  error?: Error;
}

@route("/status/{id}")
op getStatus(@path id: string): StatusMonitor | ErrorResult;

@pollingOperation(getStatus)
op repairWidget is StandardResourceOperations.LongRUnningResourceAction<Widget>;
```

We would expect `getLroMetadata` to return the foillowing data for this operation:

```typescript
{
  envelopeResult: StatusMonitor, // the return value of getStatus
  logicalResult: Widget; // The `result` field in the StatusMonitor
  logicalPath: "result",
  finalStateVia: "operation-location",
  statusMonitorStep: {
    target: {
      kind: "link"
      location: "ResponseHeader",
      property: operationLocation
    }
  },
  pollingInfo: {
    resultProperty: StatusMonitor.result,
    errorProperty: StatusMonitor.error,
    terminationStatus: {
      property: StatusMonitor.result,
      succeededState: ["Completed"],
      canceledState ["Aborted"],
      failedState: ["Faulted"],
    }
  }
}
```

#### Example 2 - Status Monitor with custom result fields

In this example, the status monitor returns the result of a successful operation in a field with a name other than 'result'

```tsp
@lroStatus
num OperationStatus {
  Running,
  Succeeded,
  Canceled,
  Failed
}

model StatusMonitor {
  status: OperationStatus;
  @lroResult
  success?: Widget;
  @lroErrorResult
  failure?: Error;
}

@route("/status/{id}")
op getStatus(@path id: string): StatusMonitor | ErrorResult;

@pollingOperation(getStatus) // sets the status monitor for the operation
op repairWidget is StandardResourceOperations.LongRUnningResourceAction<Widget, WidgetRepairRequest>;
```

We would expect `getLroMetadata` to return the foillowing data for this operation:

```typescript
{
  envelopeResult: StatusMonitor, // the return value of getStatus
  logicalResult: Widget; // The `result` field in the StatusMonitor
  logicalPath: "success",
  finalStateVia: "operation-location",
  statusMonitorStep: {
    target: {
      kind: "link"
      location: "ResponseHeader",
      property: operationLocation
    }
  },
  pollingInfo: {
    resultProperty: StatusMonitor.success,
    errorProperty: StatusMonitor.failure,
    terminationStatus: {
      property: StatusMonitor.result,
      succeededState: ["Succeeded"],
      canceledState ["Canceled"],
      failedState: ["Failed"],
    }
  }
}
```

#### Example 3 - Link to StatusMonitor in the `location` header

In this example, the operation returns a `location` header with a link to the Status Monitor instead of the recommended `Operation-Location` header

```tsp
@lroStatus
union OperationStatus {
  Running: "Running",
  Succeeded: "Succeeded",
  Canceled: "Canceled",
  Failed: "Failed",
  string,
}

model StatusMonitor {
  status: OperationStatus;
  result?: Widget;
  error?: Error;
}

@route("/status/{id}")
op getStatus(@path id: string): StatusMonitor | ErrorResult;

alias RepairAccepted = {
  @statusCode _: 202;

  @pollingLocation // this marks the response property or header that will contain a link to the Status Monitor
  @header
  location?: ResourceLocation;
};

@pollingOperation(getStatus)
@action("repairWidget")
@post
op repairWidget is Azure.Core.Foundations.Operation<
  InstanceKeysOf<Widget> & WidgetRepairRequest,
  RepairAccepted
>;
```

We would expect `getLroMetadata` to return the foillowing data for this operation:

```typescript
{
  envelopeResult: StatusMonitor, // the return value of getStatus
  logicalResult: Widget; // The `result` field in the StatusMonitor
  logicalPath: "result",
  finalStateVia: "location",
  statusMonitorStep: {
    target: {
      kind: "link"
      location: "ResponseHeader",
      property: location
    }
  },
  pollingInfo: {
    resultProperty: StatusMonitor.result,
    errorProperty: StatusMonitor.error,
    terminationStatus: {
      property: StatusMonitor.result,
      succeededState: ["Succeeded"],
      canceledState ["Canceled"],
      failedState: ["Failed"],
    }
  }
}
```

#### Example 4 - Link to StatusMonitor in the `Azure-AsyncOperation` header

In this example, the operation returns a `Azure-AsyncOperation` header with a link to the Status Monitor instead of the recommended `Operation-Location` header

```tsp
@lroStatus
union OperationStatus {
  Running: "Running",
  Succeeded: "Succeeded",
  Canceled: "Canceled",
  Failed: "Failed",
  string,
}

model StatusMonitor {
  status: OperationStatus;
  result?: Widget;
  error?: Error;
}

@route("/status/{id}")
op getStatus(@path id: string): StatusMonitor | ErrorResult;

alias RepairAccepted = {
  @statusCode _: 202;

  @pollingLocation // this marks the response property or header that will contain a link to the Status Monitor
  @header("Azure-AsyncOperation")
  azureAsyncOperation?: string;
};

@pollingOperation(getStatus)
@action("repairWidget")
@result
@post
op repairWidget is Azure.Core.Foundations.Operation<
  InstanceKeysOf<Widget> & WidgetRepairRequest,
  RepairAccepted
>;
```

We would expect `getLroMetadata` to return the foillowing data for this operation:

```typescript
{
  envelopeResult: StatusMonitor, // the return value of getStatus
  logicalResult: Widget; // The `result` field in the StatusMonitor
  logicalPath: "result",
  finalStateVia: "azure-async-operation",
  statusMonitorStep: {
    target: {
      kind: "link"
      location: "ResponseHeader",
      property: azureAsyncOperation
    }
  },
  pollingInfo: {
    resultProperty: StatusMonitor.result,
    errorProperty: StatusMonitor.error,
    terminationStatus: {
      property: StatusMonitor.result,
      succeededState: ["Succeeded"],
      canceledState ["Canceled"],
      failedState: ["Failed"],
    }
  }
}
```

#### Example 5 - Link to StatusMonitor in the `Azure-AsyncOperation` header and final link

In this example, the operation returns a link to the Status Monitor (in `Azure-AsyncOperation`) **and** a link to the final result (in `location`).

```tsp
@lroStatus
union OperationStatus {
  Running: "Running",
  Succeeded: "Succeeded",
  Canceled: "Canceled",
  Failed: "Failed",
  string,
}

model StatusMonitor {
  status: OperationStatus;
}

@route("/status/{id}")
op getStatus(@path id: string): StatusMonitor | ErrorResult;

alias RepairAccepted = {
  @statusCode _: 202;

  @pollingLocation // this marks the response property or header that will contain a link to the Status Monitor
  @header("Azure-AsyncOperation")
  azureAsyncOperation?: string;

  @finalLocation // this marks the response property or header that will contain a link to the final result
  @header
  location?: string;
};

@pollingOperation(getStatus)
@finalOperation(getWidget)
@action("repairWidget")
@result
@post
op repairWidget is Azure.Core.Foundations.Operation<
  InstanceKeysOf<Widget> & WidgetRepairRequest,
  RepairAccepted
>;

op getWidget is StandardResourceOperations.ResourceRead<Widget>;
```

We would expect `getLroMetadata` to return the foillowing data for this operation:

```typescript
{
  envelopeResult: StatusMonitor, // the return value of getStatus
  logicalResult: Widget; // The `result` field in the StatusMonitor
  logicalPath: "",
  finalStateVia: "location",
  statusMonitorStep: {
    target: {
      kind: "link"
      location: "ResponseHeader",
      property: azureAsyncOperation
    }
  },
  finalStep: {
    target: {
      kind: "link"
      location: "ResponseHeader",
      property: location
    }
  },
  pollingInfo: {
    resultProperty: StatusMonitor.result,
    errorProperty: StatusMonitor.error,
    terminationStatus: {
      property: StatusMonitor.result,
      succeededState: ["Succeeded"],
      canceledState ["Canceled"],
      failedState: ["Failed"],
    }
  }
}
```

#### Example 6 - Calling GetStatusMonitor operation with non-standard parameters

In this example, the operation does not return a link, instead, the request parameters and response properties can be used to call the `getStatus` operation that returns the Status Monitor.

```tsp
@lroStatus
union OperationStatus {
  Running: "Running",
  Succeeded: "Succeeded",
  Canceled: "Canceled",
  Failed: "Failed",
  string,
}

model StatusMonitor {
  status: OperationStatus;
  result?: Widget;
  error?: Error;
}

@route("/status/{id}")
op getStatus(@path widgetId: string): StatusMonitor | ErrorResult;

alias RepairAccepted = {
  @statusCode _: 202;
};

@pollingOperation(getStatus)
@action("repairWidget")
@result
@post
op repairWidget(
  @pollingOperationParameter(getStatus::parameters.widgetId) @path id: string,
  body: WidgetRepairRequest,
): RepairAccepted | ErrorResult;
```

We would expect `getLroMetadata` to return the foillowing data for this operation:

```typescript
{
  envelopeResult: StatusMonitor, // the return value of getStatus
  logicalResult: Widget; // The `result` field in the StatusMonitor
  logicalPath: "result",
  finalStateVia: "custom-operation-reference",
  statusMonitorStep: {
    target: {
      kind: "reference",
      operation: getStatus,
      parameters: {
        widgetId: {
          sourceKind: "RequestParameter",
          source: repairWidget::parameters.id,
          target: getStatus::parameters.widgetId
        }
      }
    }
  },
  pollingInfo: {
    resultProperty: StatusMonitor.result,
    errorProperty: StatusMonitor.error,
    terminationStatus: {
      property: StatusMonitor.result,
      succeededState: ["Succeeded"],
      canceledState ["Canceled"],
      failedState: ["Failed"],
    }
  }
}
```
