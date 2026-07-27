---
validatorRuleId: LicenseHeaderMustNotBeSpecified
engine: native
tspLints: []
---

# LicenseHeaderMustNotBeSpecified

**Severity:** warning

**Applies to:** Resource Manager (ARM)

**Rule engine:** Native

## Description

The x-ms-code-generation-settings must not have the license header property.
TypeSpec does not emit this extension.

## Test Cases

| ID                        | Violation | Description                                              |
| ------------------------- | --------- | -------------------------------------------------------- |
| `license-header-present`  | false     | TypeSpec does not emit x-ms-code-generation-settings     |
