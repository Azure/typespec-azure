---
title: Advanced Topics
---

Once you have written your first service with `Azure.Core`, you might be interested to try the following features:

## Defining singleton resources

You can define a singleton resource (a resource type with only one instance) by using a string literal for the key type. Imagine we want to expose an analytics endpoint for each `Widget` instance. Here's what it would look like:

```typespec
@resource("analytics")
@parentResource(Widget)
model WidgetAnalytics {
  @key("analyticsId")
  id: "current";

  @doc("The number of uses of the widget.")
  useCount: int64;

  @doc("The number of times the widget was repaired.")
  repairCount: int64;
}
```

You can then use the standard operation signatures with this singleton resource type:

```typespec
import "@azure-tools/typespec-azure-core";

using Azure.Core;
using Azure.Core.Traits;

alias ServiceTraits = SupportsRepeatableRequests &
  SupportsConditionalRequests &
  SupportsClientRequestId;

alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

op getAnalytics is Operations.ResourceRead<WidgetAnalytics>;
op updateAnalytics is Operations.ResourceCreateOrUpdate<WidgetAnalytics>;
```

By using a literal value of `"current"` for `"id"`, the route path for these operations will be the following:

```
"/widgets/{widgetName}/analytics/current"
```

The operations defined against this singleton resource will also exclude the key parameter because it cannot be changed.
