Enums, models, operations, and their members/properties should have meaningful, nonblank documentation. Use doc comments (`/** */`) to provide descriptions.

This strengthens the existing `documentation-required` rule, already enabled in the data-plane and resource-manager rulesets; no separate opt-in rule is needed. Empty and whitespace-only strings do not satisfy existing documentation requirements. Missing-documentation scopes and exemptions are unchanged.

## Impact

- **Area:** API, SDK

Missing documentation produces poor SDK reference docs and API documentation.

## Descriptive documentation

Explicit descriptions on models, scalars, enums and members, unions and variants, operations, and properties must not repeat their effective name or the placeholder `description`. Comparisons trim whitespace, ignore periods, and ignore case.

- Operations are compared with **both their source operation name and their effective HTTP verb**, whether explicit or inferred.
- Ordinary properties use their JSON encoded name. Header, path, and query parameters use their HTTP name.
- Multipart properties use the authored part name, falling back to the property name (including array parts).
- Enum members use the member name, not its serialized value. Named union variants use their name; unnamed string variants use their literal value. Other unnamed variants are checked only for placeholder text.
- HTTP status-code properties are exempt from name comparisons.

These explicit-description checks also apply to scalars and inline properties, and to explicitly documented declarations otherwise exempt from missing-doc requirements. They do not require new documentation on those declarations. Existing rule users may now see quality warnings without changing their configuration.

```tsp
// Incorrect: repeating the source name is not a description, even with @get.
@get @doc("read") op read(): string;
```

```tsp
// Correct.
@get @doc("Reads the current widget.") op read(): string;
```

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [SummaryOrDescription](https://github.com/Azure/azure-openapi-validator/blob/main/docs/operation-summary-or-description.md).

Its descriptive-documentation checks also cover [DescriptionMustNotBeNodeName](https://github.com/Azure/azure-openapi-validator/blob/main/docs/description-must-not-be-node-name.md).

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
