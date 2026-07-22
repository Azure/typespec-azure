This diagnostic is issued when `@flattenProperty` is applied to a model property whose type is polymorphic (a discriminated type). Flattening a polymorphic type is not supported, because most languages cannot represent it.

To fix this issue, remove `@flattenProperty` from the polymorphic property, or change the property to a non-polymorphic type.

### Example

```typespec
@discriminator("kind")
model Pet {
  kind: string;
}
model Cat extends Pet {
  kind: "cat";
}

model Owner {
  @flattenProperty
  pet: Pet;
}
```

`pet` has a polymorphic type, so remove `@flattenProperty` or use a non-polymorphic property type.
