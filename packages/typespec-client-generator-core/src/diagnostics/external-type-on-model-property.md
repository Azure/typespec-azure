This diagnostic is issued when `@alternateType` with external type information is applied directly to a model property.

## Impact

- **Area:** External alternate-type mapping. Generation continues, but property-level external type information is not applied to SDK type substitution.
- **Not affected:** The model property remains in the service schema with its original TypeSpec type.

#### ❌ Incorrect Usage

```typespec
model Widget {
  @alternateType( // external alternate type is applied to a model property
    {
      identity: "external.WidgetName",
    },
    "python"
  )
  name: string;
}
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
@alternateType with external type information cannot be applied to model properties. Please apply it to the type definition itself (Scalar, Model, Enum, or Union) instead.
```

#### ✅ How to Fix

Apply the external alternate type to the scalar, model, enum, or union definition instead of to a model property:

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

## Suppression

Suppress this warning only if the property-level external alternate type is intentionally ignored and the SDK type is handled manually.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/external-type-on-model-property" "property external type handled manually"
```
