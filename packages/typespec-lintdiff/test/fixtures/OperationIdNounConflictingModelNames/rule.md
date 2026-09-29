---
validatorRuleId: OperationIdNounConflictingModelNames
engine: spectral
coverageKind: lint
tspLints:
  - tsp-lintdiff-local-linter/operation-id-noun-conflicting-model-names
---

# OperationIdNounConflictingModelNames

**Severity:** warning

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

Use distinct names for operation groups and service models. An interface named
`Widget` with an operation returning the service's `Widget` model can create a
generated client/model name conflict. Name the operation group `Widgets` instead.
The rule checks reachable models from the service's HTTP operations; an unused
model declaration or a namespaced model with a distinct qualified name does
not create a conflict. A direct service operation does not use the service's
name as an operation group unless an explicit client location supplies one.
The rule honors the effective AutoRest-scoped `@clientLocation` for operations
and `@clientName` for interfaces, namespaces, and service models. In
particular, a model renamed to a different OpenAPI definition name should not
conflict merely because its authored TypeSpec name matches the group.
ARM common-type models are excluded as group-name candidates; service-local
models referenced by their properties remain eligible.

The check uses supported TypeSpec SDK naming metadata rather than OpenAPI
operation ID overrides. Azure's `no-openapi` rule already discourages
`@operationId`; overrides on imported Swagger can still produce validator
diagnostics outside this native authoring contract.

## Test Cases

| ID                       | Violation | Description                                                 |
| ------------------------ | --------- | ----------------------------------------------------------- |
| `noun-conflicts-model`   | true      | An interface group and reachable service model share a name |
| `noun-does-not-conflict` | false     | A plural operation group has a distinct name                |
