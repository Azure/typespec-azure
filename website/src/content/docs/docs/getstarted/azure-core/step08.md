---
title: 8. Defining custom resource actions
---

Often your resource types will need additional operations that are not covered by the standard resource operation shapes. For this, there are a set of operation signatures for defining _resource actions_ at the instance and collection level.

To define a custom action you can use the `ResourceAction` and `ResourceCollectionAction` signatures from the `Azure.Core.ResourceOperations` interface. Let's define a couple of custom actions for the `Widget` and `WidgetPart` resources:

```typespec
import "@azure-tools/typespec-azure-core";

using Azure.Core;
using Azure.Core.Traits;

alias ServiceTraits = SupportsRepeatableRequests &
  SupportsConditionalRequests &
  SupportsClientRequestId;

alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

// In the Widgets interface...
@doc("Schedule a widget for repairs.")
scheduleRepairs is Operations.ResourceAction<
  Widget,
  WidgetRepairRequest,
  WidgetRepairRequest
>;

// In the WidgetParts interface...
@doc("Reorder all parts for the widget.")
reorderParts is Operations.ResourceCollectionAction<
  WidgetPart,
  WidgetPartReorderRequest,
  WidgetPartReorderRequest
>;
```

The `scheduleRepairs` operation defines a custom action for all instances of the `Widget` resource. **All collection action templates expect 3 parameters:** the resource type, the request action parameters, and the response type. In this case, `WidgetRepairRequest` is both the parameter and response type because we are using it as the body of both the request and the response of this operation.

> **NOTE:** The request parameters and response type **do not** have to be the same type!

We also define an collection operation called `reorderParts`. Similarly to `scheduleRepairs`, it uses the `WidgetPartReorderRequest` as the request and response body.

Here are what the routes of these two operations will look like:

```
/widgets/{widgetName}:scheduleRepairs
/widgets/{widgetName}/parts:reorderParts
```

Notice that the operation name is used as the action name in the route!

There are also long-running operation versions of these two operations:

- `LongRunningResourceAction`
- `LongRunningResourceCollectionAction`

The same rules described in the [long-running operations](step06) section also apply to these long-running action signatures.
