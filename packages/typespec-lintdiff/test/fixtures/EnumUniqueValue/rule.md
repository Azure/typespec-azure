---
validatorRuleId: EnumUniqueValue
engine: native
tspLints: []
coverageKind: blocked
---

# EnumUniqueValue

**Severity:** error

**Applies to:** Resource Manager (ARM)

Enum values must be unique.

Treat this case as **blocked / suppression-dependent** locally. The duplicate
enum-value repro depends on suppressing `@azure-tools/typespec-azure-core/no-enum`,
so it is not a clean native-lint target for normal TypeSpec authoring.

| ID          | Violation | Description                                        |
| ----------- | --------- | -------------------------------------------------- |
| `compliant` | false     | Standard TypeSpec compiles without violating rule   |
