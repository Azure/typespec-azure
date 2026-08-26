---
validatorRuleId: GetInOperationName
engine: spectral
coverageKind: lint
projectionScope: http-reachable
tspLints:
  - tsp-lintdiff-local-linter/get-in-operation-name
---

# GetInOperationName

**Severity:** warning

**Applies to:** Both ARM and DataPlane

**Original rule:** [Azure/azure-openapi-validator `GetInOperationName`](https://github.com/Azure/azure-openapi-validator/blob/main/docs/get-in-operation-name.md)

For each HTTP GET operation, the emitted `operationId` must start with `Get` or
`List`, either directly or after a noun and underscore. Matching is
case-sensitive, so `Widgets_Get`, `Widgets_ListByGroup`, `GetWidget`, and
`ListWidgets` are compliant while `Widgets_get` and `Widgets_listByGroup` are
not.
