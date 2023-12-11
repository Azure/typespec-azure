# 4. Defining your first resource

Now we're ready to describe our first resource type. A "resource" is a model type that represents a fundamental type in the domain model of your service.

For our `WidgetService`, the most obvious model type that we will need is called `Widget`. We can create it by creating a `model` that is annotated with the `@resource` decorator. Add the following lines after the top-level `namespace` declaration:

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

There are a few important things to point out here:

- The `Widget` model has a `@resource` decorator with a parameter of `"widgets"`. This string is the "collection name" of the resource and affects where the resource appears in the service URI layout.
- The `name` property has a `@key` decorator with a parameter of `"widgetName"`. This string customizes the name of the path parameter (and the parameter name itself) in operations that use this resource type. There _must_ be one property with a `@key` decorator on all resource types!
- The `@visibility("read")` decorator on the `name` property says that the `name` property should only appear in operation responses but not in operations that allow you to change properties of the `Widget` resource.
- We use `@doc` decorators on the model type and all properties to describe. Documentation strings are enforced by linting rule when authoring specs with `Azure.Core`!

Great, now we have a resource type! Now, how do we define operations for this resource?
