---
validatorRuleId: DefaultErrorResponseSchema
engine: native
coverageKind: template
tspTemplateLints:
  - '@azure-tools/typespec-azure-core/use-standard-operations'
---

# DefaultErrorResponseSchema

**Severity:** error

**Applies to:** Resource Manager (ARM)

Default error responses must follow the error schema.

The current ARM compliance control pins the bundled `common-types` v3 reference set and validates
cleanly, so there is no remaining local evidence of a native lint gap here. The earlier noisy
fixture was a local common-types resolution problem, not proof that template-generated ARM error
responses need new TypeSpec lint coverage.

| ID          | Violation | Description                                        |
| ----------- | --------- | -------------------------------------------------- |
| `compliant` | false     | Standard TypeSpec compiles without violating rule   |
