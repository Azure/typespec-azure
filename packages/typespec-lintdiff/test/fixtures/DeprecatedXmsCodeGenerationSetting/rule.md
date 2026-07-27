---
validatorRuleId: DeprecatedXmsCodeGenerationSetting
engine: native
tspLints: []
---

# DeprecatedXmsCodeGenerationSetting

**Severity:** warning

**Applies to:** Resource Manager (ARM)

**Rule engine:** Native

## Description

The x-ms-code-generation-settings extension is deprecated and should not be present.
TypeSpec does not emit this extension, so no violation is possible.

## Test Cases

| ID                          | Violation | Description                                              |
| --------------------------- | --------- | -------------------------------------------------------- |
| `code-gen-settings-present` | false     | TypeSpec does not emit x-ms-code-generation-settings     |
