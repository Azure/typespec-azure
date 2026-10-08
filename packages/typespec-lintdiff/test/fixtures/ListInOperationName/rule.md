---
validatorRuleId: ListInOperationName
engine: spectral
coverageKind: partial
tspLints:
  - tsp-lintdiff-local-linter/list-in-operation-name
officialTspLints:
  - "@azure-tools/typespec-azure-core/use-standard-names"
---

# ListInOperationName

**Severity:** warning

**Applies to:** Both ARM and DataPlane

**Original rule:** [Azure/azure-openapi-validator `ListInOperationName`](https://github.com/Azure/azure-openapi-validator/blob/main/docs/list-in-operation-name.md)

Operations whose emitted OpenAPI contains `x-ms-pageable`, or whose response
schema has a `value` array and no more than one other property, must emit an
`operationId` matching `Noun_List*` or exactly `List`.

Standard ARM list templates produce compliant operation IDs, while the official
`use-standard-names` rule covers data-plane services but is disabled by the ARM
ruleset. This direct rule covers custom ARM operations that can emit the same
Swagger shapes without using those templates.
