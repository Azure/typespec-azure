---
validatorRuleId: EnumMustNotHaveEmptyValue
engine: native
tspLints: []
coverageKind: blocked
---

# EnumMustNotHaveEmptyValue

**Severity:** error

**Applies to:** Resource Manager (ARM)

Enum values must not be empty strings.

Treat this case as **blocked / suppression-dependent** locally. The violating
fixture only exists after suppressing `@azure-tools/typespec-azure-core/no-enum`,
so it is not a clean native-lint target for normal TypeSpec authoring.

| ID          | Violation | Description                                        |
| ----------- | --------- | -------------------------------------------------- |
| `compliant` | false     | Standard TypeSpec compiles without violating rule   |
