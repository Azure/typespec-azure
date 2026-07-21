This diagnostic is issued when `@flattenProperty` is applied to a model property whose type is polymorphic through a discriminator.

To fix this issue, remove `@flattenProperty` from polymorphic properties or change the property to use a non-polymorphic type.

### Example

```typespec
using Azure.ClientGenerator.Core.Legacy;

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
