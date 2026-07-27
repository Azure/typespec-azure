---
validatorRuleId: SchemaNamesConvention
engine: spectral
tspLints:
  - "@azure-tools/typespec-azure-core/casing-style"
---

# SchemaNamesConvention

**Severity:** warning

**Applies to:** Data Plane

**Rule engine:** Spectral

## Description

Validates that all schema definition names follow PascalCase naming convention.
Consistent naming helps with SDK generation and API consistency.

## Detection Logic

The rule inspects each schema definition name:

1. If the name does not match PascalCase pattern → warning.

## Test Cases

| ID                      | Violation         | Description                                                  |
| ----------------------- | ----------------- | ------------------------------------------------------------ |
| `non-pascal-case-name`  | camelCase name    | Model named "widgetResponse" instead of "WidgetResponse"     |
