---
title: 4. Defining your first resource
---

In the context of your service, a "resource" is a fundamental entity that your service manages. For our `WidgetService`, the most basic entity we need is a `Widget`.

To create a `Widget`, we need to define a `model` and annotate it with the `@resource` decorator.

## Code implementation

After the top-level `namespace` declaration, add the following lines:

```typespec
@doc("A widget.")
@resource("widgets")
model Widget {
  @key("widgetName")
  @doc("The widget name.")
  @visibility("read")
  name: string;

  @doc("The ID of the widget's manufacturer.")
  manufacturerId: string;
}
```

## Code explanation

Here are some important points about the code:

- The `Widget` model has a `@resource` decorator with a parameter of `"widgets"`. This string is the "collection name" of the resource and it determines where the resource appears in the service URI layout.
- The `name` property has a `@key` decorator with a parameter of `"widgetName"`. This string customizes the name of the path parameter (and the parameter name itself) in operations that use this resource type. Note that there _must_ be one property with a `@key` decorator on all resource types!
- The `@visibility("read")` decorator on the `name` property indicates that the `name` property should only appear in operation responses, not in operations that allow you to change properties of the `Widget` resource.
- We use `@doc` decorators on the model type and all properties for description. Documentation strings are enforced by linting rule when authoring specs with `Azure.Core`!

Now that we have a resource type, the next step is to define operations for this resource.
