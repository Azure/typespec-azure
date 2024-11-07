---
title: 7. Defining child resources
---

Sometimes your resource types will need to have child resources that relate to their parent types. You can identify that a resource type is the child of another resource by using the `@parentResource` decorator.

For example, here's how you could create a new `WidgetPart` resource under the `Widget` defined above:

```typespec
@doc("A WidgetPart resource belonging to a Widget resource.")
@resource("parts")
@parentResource(Widget)
model WidgetPart {
  @key("partName")
  name: string;

  @doc("The part number.")
  number: string;

  @doc("The part name.")
  partName: string;
}
```

When you use the standard resource operations with child resource types, their operation routes will include the route of the parent resource. For example, we might define the following operations for `WidgetPart`:

```typespec
import "@azure-tools/typespec-azure-core";

using Azure.Core;
using Azure.Core.Traits;

alias ServiceTraits = SupportsRepeatableRequests &
  SupportsConditionalRequests &
  SupportsClientRequestId;

alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

@doc("Creates a WidgetPart")
createWidgetPart is Operations.ResourceCreateWithServiceProvidedName<WidgetPart>;

@doc("Get a WidgetPart")
getWidgetPart is Operations.ResourceRead<WidgetPart>;
```

These operations will be defined under the route path:

```
/widgets/{widgetName}/parts/{partName}
```
