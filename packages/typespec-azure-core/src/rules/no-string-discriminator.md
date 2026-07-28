Azure services favor using an extensible union to define the discriminator property. This allow the service to add new discriminated models without being breaking.

## Impact

- **Area:** SDK

A string discriminator leaves the discriminant values unknown, making SDKs less usable.

#### ❌ Incorrect

- Missing explicit property

```tsp
@discriminator("kind")
model Pet {
  name: string;
}
```

- Property is a string

```tsp
@discriminator("kind")
model Pet {
  kind: string;
  name: string;
}
```

- Property is a closed enum

```tsp
@discriminator("kind")
model Pet {
  kind: PetKind;
  name: string;
}
enum PetKind {
  cat,
  dog,
}
```

#### ✅ Correct

- Property is a closed enum

```tsp
@discriminator("kind")
model Pet {
  kind: PetKind;
  name: string;
}
union PetKind {
  cat: "cat",
  dog: "dog",
  string,
}
```

## Suppression

Suppress only when required to match an existing API; otherwise use an open union as the discriminator.
