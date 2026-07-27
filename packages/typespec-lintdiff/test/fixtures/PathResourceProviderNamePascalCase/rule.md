---
validatorRuleId: PathResourceProviderNamePascalCase
engine: native
tspLints:
  - tsp-lintdiff-local-linter/path-resource-provider-name-pascal-case
tspRuleset: resource-manager
---

# PathResourceProviderNamePascalCase

**Severity:** error

**Applies to:** Resource Manager (ARM)

The resource provider namespace in ARM paths must follow PascalCase convention (e.g., `Microsoft.Compute`, not `microsoft.compute`).

## Semantic coverage notes

The upstream rule extracts `providers/{namespace}` segments from every path and validates PascalCase via regex.

The TypeSpec-native rule checks the resolved `@armProviderNamespace` value on the service namespace. The default behavior derives from the TypeSpec namespace name (which `casing-style` already enforces as PascalCase), but the explicit string override `@armProviderNamespace("...")` accepts arbitrary values and is the primary violation vector.

## Test Cases

| ID                          | Violation | Description                                                       |
| --------------------------- | --------- | ----------------------------------------------------------------- |
| `non-pascal-case-provider`  | yes       | Explicit `@armProviderNamespace("microsoft.testservice")` override |
| `compliant`                 | no        | Default `@armProviderNamespace` derived from PascalCase namespace  |
