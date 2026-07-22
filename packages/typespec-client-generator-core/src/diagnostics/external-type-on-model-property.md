This diagnostic is issued when `@alternateType` with external type information is applied directly to a model property.

To fix this issue, apply the external alternate type to the scalar, model, enum, or union definition instead of to a model property.

### Example

Instead of applying external type information to a property:

```typespec
model Widget {
  @alternateType(
    {
      identity: "external.WidgetName",
    },
    "python"
  )
  name: string;
}
```

Apply it to a type definition:

```typespec
@alternateType(
  {
    identity: "external.WidgetName",
  },
  "python"
)
scalar WidgetName extends string;

model Widget {
  name: WidgetName;
}
```
