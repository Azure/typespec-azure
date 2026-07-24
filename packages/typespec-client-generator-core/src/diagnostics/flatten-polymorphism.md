This diagnostic is issued when `@flattenProperty` is applied to a model property whose type is polymorphic (a discriminated type). Flattening a polymorphic type is not supported, because most languages cannot represent it.

## Impact

- **Area:** SDK model flattening. Blocks applying `@flattenProperty` because flattening a discriminated model would break generated polymorphic model structure.
- **Not affected:** The discriminator and inheritance described by the service model remain unchanged.

#### ❌ Incorrect Usage

```typespec
@discriminator("kind")
model Pet {
  kind: string;
}
model Cat extends Pet {
  kind: "cat";
}

model Owner {
  @flattenProperty // `pet` has polymorphic type `Pet`
  pet: Pet;
}
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Cannot flatten property of polymorphic type.
```

#### ✅ How to Fix

Remove `@flattenProperty` from the polymorphic property, or change the property to a non-polymorphic type.

```typespec
@discriminator("kind")
model Pet {
  kind: string;
}
model Cat extends Pet {
  kind: "cat";
}

model Owner {
  pet: Pet;
}
```
