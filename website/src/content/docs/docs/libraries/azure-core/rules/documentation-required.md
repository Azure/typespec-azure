---
title: "documentation-required"
---

```text title="Full name"
@azure-tools/typespec-azure-core/documentation-required
```

Enums, models, operations, and their members/properties should have documentation. Use doc comments (`/** */`) to provide descriptions.

#### ❌ Incorrect

Model without documentation:

```tsp
model Pet {
  name: string;
}
```

Operation without documentation:

```tsp
op read(): void;
```

Enum without documentation:

```tsp
enum PetKind {
  Cat,
  Dog,
}
```

#### ✅ Correct

```tsp
/** A pet in the system. */
model Pet {
  /** The name of the pet. */
  name: string;
}

/** Reads a pet resource. */
op read(): Pet;

/** The kind of pet. */
enum PetKind {
  /** A cat. */
  Cat,
  /** A dog. */
  Dog,
}
```

Version enums and discriminator enums/unions are exempt from this rule as they are considered self-documenting.
