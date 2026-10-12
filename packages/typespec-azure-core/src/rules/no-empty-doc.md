Explicit documentation must contain at least one non-whitespace character. Empty documentation
leaves API users without an explanation of a declaration and can result in missing descriptions
in generated clients and API reference documentation.

This rule checks documentation supplied through `@doc` or documentation comments on namespaces,
interfaces, operations, models, properties, scalars, enums and their members, unions, and union
variants. Missing documentation is outside this rule's scope; `documentation-required` checks
whether documentation is required. This rule does not judge prose quality.

## Impact

- **Area:** SDK, API

Blank documentation can hide the purpose of an API or property from users of generated clients.
Replace empty placeholders with a meaningful explanation, or remove an intentional placeholder
when documentation is not required.

#### Incorrect

```tsp
model Widget {
  @doc(" ")
  name: string;
}
```

#### Correct

```tsp
model Widget {
  @doc("The widget name.")
  name: string;
}
```

## Suppression

Suppress this rule only when documentation is intentionally blank and cannot be removed or
replaced, for example when adapting a declaration whose documentation is managed externally.
Prefer useful documentation over suppression.

## LintDiff Equivalent

This rule corresponds to the documentation-content guideline in
[DescriptiveDescriptionRequired](https://github.com/Azure/azure-openapi-validator/blob/main/docs/descriptive-description-required.md).
