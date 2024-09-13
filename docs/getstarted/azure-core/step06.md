# 6. Defining long-running resource operations

If your service uses any long-running operations (LROs; see [our guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#long-running-operations--jobs) for specifics), you will need to define a "status monitor" operation which can report the status of the operation.

Let's say that we want to make our `createOrUpdateWidget` and `deleteWidget` operations long-running. Here's how we can update our `Widgets` interface to accomplish that:

```typespec
import "@azure-tools/typespec-azure-core";

using Azure.Core;
using Azure.Core.Traits;

alias ServiceTraits = SupportsRepeatableRequests &
  SupportsConditionalRequests &
  SupportsClientRequestId;

alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

interface Widgets {
  @doc("Get status of a Widget operation. This operation return status in status code. No response body is returned.")
  getWidgetOperationStatus is Operations.GetResourceOperationStatus<Widget, never>;

  @doc("Fetch a Widget by name.")
  getWidget is Operations.ResourceRead<Widget>;

  @doc("Create or replace a Widget asynchronously.")
  @pollingOperation(Widgets.getWidgetOperationStatus)
  createOrUpdateWidget is Operations.LongRunningResourceCreateOrReplace<Widget>;

  @doc("Delete a Widget asynchronously.")
  @pollingOperation(Widgets.getWidgetOperationStatus)
  deleteWidget is Operations.LongRunningResourceDelete<Widget>;

  @doc("List Widget resources.")
  listWidgets is Operations.ResourceList<Widget>;
}
```

1. We change `createOrUpdateWidget` to use `LongRunningResourceCreateOrReplace<Widget>` and `deleteWidget` to use `LongRunningResourceDelete`.
2. We define the `getWidgetOperationStatus` operation based on the `GetResourceOperationStatus` signature. This defines the operation status monitor as a child resource of the `Widget` type so that it shows up under that resource in the route hierarchy.
3. We **must** add the `pollingOperation` decorator to both of the long-running operations and reference the `Widgets.getWidgetOperationStatus` operation. This connects the long-running operations to their associated status monitor operation to make it easier for service clients to be generated.

> **NOTE:** The status monitor operation **must** be defined earlier in the interface than the long-running operations that reference it otherwise TypeSpec will not be able to resolve the reference!

See [considerations for service design](https://github.com/microsoft/api-guidelines/blob/vNext/azure/ConsiderationsForServiceDesign.md#long-running-operations) for more information about LROs.
