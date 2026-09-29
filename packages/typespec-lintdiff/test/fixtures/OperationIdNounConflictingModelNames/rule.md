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

Use distinct names for operation ID nouns and service schema types. An interface
named `Widget` with an operation returning the service's `Widget` model can
create a generated client/schema name conflict. The same conflict can occur with
a reachable named scalar, enum, union, or model derived from a response body
model. Use the plural noun `Widgets` instead. The rule checks schema types
reachable from HTTP request and response bodies; query/path/header-only types,
unused declarations, and types in distinct nested namespaces do not create a
conflict. A direct service operation contributes a noun only when its effective
operation name contains an underscore.
For template models and supported template unions, a concrete instance
with `@friendlyName` contributes its friendly schema name; an unnamed instance
that remains inline does not contribute its template declaration name.
The rule honors the effective AutoRest-scoped `@clientLocation` for operations
and `@clientName` for interfaces, namespaces, and service schema types. Because
the validator checks the operation ID segment before the first underscore, a
group such as `Widget_Admin` is compared as `Widget`. In particular, a schema
renamed to a different OpenAPI definition name should not conflict merely
because its authored TypeSpec name matches the group. ARM common types are
excluded as group-name candidates; service-local models referenced by their
properties remain eligible. Models decorated with
`@Azure.ResourceManager.Legacy.externalTypeRef` are also excluded because
AutoRest emits an external reference instead of a local definition for the
decorated model. Their service-local property types remain eligible because
AutoRest still emits those reachable definitions.

The check uses supported TypeSpec SDK naming metadata rather than OpenAPI
operation ID overrides. Azure's `no-openapi` rule already discourages
`@operationId`; overrides on imported Swagger can still produce validator
diagnostics outside this native authoring contract.

## Test Cases

| ID                       | Violation | Description                                                   |
| ------------------------ | --------- | ------------------------------------------------------------- |
| `noun-conflicts-model`   | true      | An operation ID noun and reachable service model share a name |
| `noun-does-not-conflict` | false     | A plural operation ID noun has a distinct name                |
