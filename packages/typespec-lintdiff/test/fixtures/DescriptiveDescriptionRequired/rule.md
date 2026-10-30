---
validatorRuleId: DescriptiveDescriptionRequired
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/descriptive-description-required
---

# DescriptiveDescriptionRequired

**Severity:** error

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

Explicit documentation must contain at least one non-whitespace character. This rule checks
`@doc` and documentation comments on namespaces, interfaces, operations, models, properties,
scalars, enums, enum members, unions, and union variants. Missing documentation is not a
violation of this rule.

It does not judge prose quality: punctuation or a short label is nonblank content. Use a
meaningful explanation of the documented declaration, rather than an empty placeholder.

### Incorrect

```typespec
model Widget {
  @doc(" ")
  name: string;
}
```

### Correct

```typespec
model Widget {
  @doc("The widget name.")
  name: string;
}
```

## Migration

The Swagger validator selects description fields in unresolved OpenAPI 2 documents and
checks string values with `trim()`. The native rule instead reads documentation through
the compiler's `getDoc` API and reports the semantic declaration itself; it does not run
an emitter or inspect OpenAPI extensions.

Azure Core's `documentation-required` checks whether selected declarations have documentation.
Its truthiness check does not reject whitespace-only strings. This rule addresses the separate
provided-documentation content requirement, including declaration kinds outside that rule's
scope; it does not add another missing-documentation requirement.

Native checks also include declarations not emitted in the selected service version and
documentation on interfaces and scalars. These are intentional native authoring coverage,
not proof of exact Swagger diagnostic parity. See [migration.md](./migration.md) for
the compared populations, emitter differences, and validation evidence.

### Native contract

- Semantic layer: compiler documentation metadata (`getDoc`), without HTTP resolution or
  emission. The diagnostic unit is each visited declaration with explicit trim-empty content;
  its target is that declaration, not its parent.
- Missing documentation is excluded. Empty, ASCII whitespace, and Unicode whitespace are
  violations; any non-whitespace character is compliant. The rule does not rate prose quality.
- The compiler does not dispatch enum-member listener events. Check `enum.members` in the
  enum callback, as Azure Core's `require-docs.ts` does. Native regression tests cover this
  rule-owned enumeration and the precise property targets.
- No custom namespace, provider, version, or reachability filter is needed for this generic
  authoring requirement. The linter framework owns traversal and library filtering.
- The native suite is compiler-only. It validates all registered target kinds, missing/blank/
  nonblank values, the documentation examples above, and individual diagnostic locations.

## Test Cases

| ID                             | Violation | Description                                       |
| ------------------------------ | --------- | ------------------------------------------------- |
| `empty-description`            | true      | Model property with a whitespace-only description |
| `whitespace-param-description` | true      | Parameter with a whitespace-only description      |
| `non-empty-description`        | false     | Comparable descriptions contain meaningful text   |
| `enum-member-description`      | true      | Enum member with a whitespace-only description    |
