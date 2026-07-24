Enums, models, operations, and their members/properties should have documentation. Use doc comments (`/** */`) to provide descriptions.

## Impact

- **Area:** API, SDK

Missing documentation produces poor SDK reference docs and API documentation.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [SummaryOrDescription](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md).

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

:::note
Version enums and discriminator enums/unions are exempt from this rule as they are considered self-documenting.
:::

## Suppression

Do not suppress. Add a `/** */` doc comment or an `@doc` decorator.
