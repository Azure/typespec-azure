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

The value of the 'description' property must be descriptive. It cannot be spaces or an empty description.

## Semantic coverage notes

The upstream rule matrix is simple:

- whitespace-only or empty descriptions should violate
- non-empty descriptions should pass
- missing descriptions are outside this rule's responsibility and are handled by other rules

The local suite now covers both a model-property example and a parameter-description example for the
invalid branch, plus a clean non-empty control case.

## Test Cases

| ID                              | Violation | Description                                             |
| ------------------------------- | --------- | ------------------------------------------------------- |
| `empty-description`             | true      | Model property with a whitespace-only description       |
| `whitespace-param-description`  | true      | Parameter with a whitespace-only description            |
| `non-empty-description`         | false     | Comparable descriptions contain meaningful text         |
