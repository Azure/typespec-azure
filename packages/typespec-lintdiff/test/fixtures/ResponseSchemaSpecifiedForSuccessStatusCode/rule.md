---
validatorRuleId: ResponseSchemaSpecifiedForSuccessStatusCode
engine: spectral
tspLints:
  - "@azure-tools/typespec-azure-resource-manager/no-response-body"
tspRuleset: resource-manager
---

# ResponseSchemaSpecifiedForSuccessStatusCode

An ARM PUT `200` or `201` success response must have a response schema specified.

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Mapping

This rule maps to `@azure-tools/typespec-azure-resource-manager/no-response-body`.
Within the validator's intended scope, the semantics align: an ARM PUT `200`/`201`
response that lacks a Swagger schema is the same underlying problem as a TypeSpec
success response with no body.

The native TypeSpec rule is broader than this validator rule because it applies to
other non-`202`/`204` success responses as well. We still record it as the best
direct mapping for the ARM PUT scenarios this validator rule targets.

## TypeSpec source notes

This mapping is backed by
`typespec-azure/packages/typespec-azure-resource-manager/src/rules/no-response-body.ts`.
The ARM native rule explicitly enforces that success `2xx` responses other than `202`
and `204` must have bodies, which matches the validator's missing-schema behavior on
ARM PUT `200`/`201` responses. The implementation also includes ARM-specific
exceptions for `POST`/`DELETE` `200` responses, which is why we document the mapping
as scoped to the validator's intended PUT scenario.

| ID          | Violation | Description                                           |
| ----------- | --------- | ----------------------------------------------------- |
| `compliant` | true      | Legacy case name; raw ARM PUT returns `200`/`201` with no schema |
