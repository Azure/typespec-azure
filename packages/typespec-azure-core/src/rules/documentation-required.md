Enums, models, operations, and their members/properties should have meaningful documentation. Use doc comments (`/** */`) or `@doc` to provide descriptions.

Explicit descriptions must not be empty, whitespace-only, the placeholder `description`, or a repetition of the name they describe. Name comparisons ignore surrounding whitespace, periods, and case.

- Ordinary properties use their authored names, regardless of serialization names.
- Operations are compared with their authored names and effective HTTP verbs. HTTP parameters and multipart parts use their HTTP names, falling back to the property name for unnamed parts.
- Enum members and named union variants use their names; unnamed string variants use their values. HTTP status-code properties are exempt from name comparisons.

Namespaces, interfaces, and scalars do not require documentation, but explicitly supplied blank descriptions are checked. Explicit documentation on inline properties and declarations exempt from missing-documentation requirements is also checked. Uninstantiated template documentation unavailable from the compiler is not checked.

## Impact

- **Area:** API, SDK

Missing or uninformative documentation produces poor SDK reference docs and API documentation.

#### ❌ Incorrect

Missing documentation:

```tsp
model Pet {
  name: string;
}
```

Descriptions that only repeat the authored names:

```tsp
/** Widget */
model Widget {
  /** Name */
  name: string;
}
```

An explicitly blank description:

```tsp
@doc(" \t")
scalar Label extends string;
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

/** A display label shown to users. */
scalar Label extends string;
```

:::note
Version enums and discriminator enums/unions are exempt from missing-documentation requirements as they are considered self-documenting. Explicit descriptions on these declarations are still checked for blank or uninformative content.
:::

## Suppression

Do not suppress. Add a meaningful `/** */` doc comment or an `@doc` decorator.
