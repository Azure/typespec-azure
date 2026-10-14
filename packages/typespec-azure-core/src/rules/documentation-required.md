Enums, models, operations, and their members/properties should have meaningful, nonblank documentation. Use doc comments (`/** */`) to provide descriptions.

This strengthens the existing `documentation-required` rule, already enabled in the data-plane and resource-manager rulesets; no separate opt-in rule is needed. Empty and whitespace-only strings do not satisfy existing documentation requirements. Missing-documentation scopes and exemptions are unchanged.

## Impact

- **Area:** API, SDK

Missing documentation produces poor SDK reference docs and API documentation.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [SummaryOrDescription](https://github.com/Azure/azure-openapi-validator/blob/main/docs/operation-summary-or-description.md).

### Consolidated documentation coverage

The checks formerly proposed as `no-empty-doc` are part of the existing `documentation-required` rule, not a separate opt-in rule.

| Migrated lintdiff rule                                                                                                                | Coverage in this existing TypeSpec rule                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [SummaryOrDescription](https://github.com/Azure/azure-openapi-validator/blob/main/docs/operation-summary-or-description.md)           | Existing documentation requirements for types, operations, and members, with the existing missing-documentation scopes and exemptions retained.                             |
| [DescriptiveDescriptionRequired](https://github.com/Azure/azure-openapi-validator/blob/main/docs/descriptive-description-required.md) | Rejects empty or whitespace-only explicit documentation on the additional targets listed below, without newly requiring documentation where absence was previously allowed. |

This intentionally strengthens the previous truthiness check, which accepted whitespace-only strings. It uses compiler-exposed documentation metadata rather than inspecting emitted Swagger fields; uninstantiated template documentation unavailable from the compiler remains outside its coverage.

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

## Explicit documentation

Every explicit `@doc` string must contain non-whitespace content. In addition to the existing required targets, this includes namespaces, interfaces, scalars, inline model properties, all union variants, and explicitly documented declarations exempt from missing-doc requirements. Enum members are checked individually.

Checks use documentation metadata exposed by the compiler. Uninstantiated template declarations whose documentation is not exposed remain exempt.

Documentation is not newly required on these additional targets: absent documentation remains allowed where it was previously allowed. However, an explicit blank description now warns for existing rule users without a configuration change. Whitespace-only strings previously passed the rule's truthiness check.

```tsp
// Incorrect.
@doc(" \t")
scalar Label extends string;
```

```tsp
// Correct.
@doc("A display label shown to users.")
scalar Label extends string;
```

This blank-documentation check corresponds to LintDiff's [DescriptiveDescriptionRequired](https://github.com/Azure/azure-openapi-validator/blob/main/docs/descriptive-description-required.md).

## Suppression

Do not suppress. Add a `/** */` doc comment or an `@doc` decorator.
