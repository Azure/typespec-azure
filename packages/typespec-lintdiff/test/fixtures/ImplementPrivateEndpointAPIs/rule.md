---
validatorRuleId: ImplementPrivateEndpointAPIs
engine: native
tspLints:
  - tsp-lintdiff-local-linter/implement-private-endpoint-apis
coverageKind: lint
---

# ImplementPrivateEndpointAPIs

**Severity:** warning

**Applies to:** Resource Manager (ARM)

## Description

Services supporting private endpoints must implement all required private endpoint APIs.
The native lint treats the upstream rule as a three-path matrix over a single parent
resource path:

- `/privateEndpointConnections/{privateEndpointConnectionName}`
- `/privateEndpointConnections`
- `/privateLinkResources`

Once any one of those APIs is present for a resource, the other two must also exist.
A standard ARM service with no private endpoint resources stays compliant.

## Semantic coverage notes

The local lint walks authorable ARM resource operations and groups the three required
private endpoint API shapes by parent resource path. It directly covers the clean
TypeSpec ARM matrix for all eight presence/absence combinations of those paths.

One subset (`missing-private-endpoint-list`) also triggers the existing
`nested-resources-must-have-list-operation` lint because the private endpoint
connection resource is nested and lacks a collection GET. That related warning is
expected and preserved in snapshots.

Raw custom-route/OpenAPI-only private endpoint paths that are authored outside ARM
resource metadata are not part of the clean authorable matrix in this repo and remain
outside this native lint's scope.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `missing-private-endpoint` | yes | Private endpoint point + collection APIs exist, but `privateLinkResources` is missing |
| `missing-private-endpoint-list` | yes | Private endpoint point API and `privateLinkResources` exist, but the collection API is missing |
| `missing-private-endpoint-point` | yes | Private endpoint collection API and `privateLinkResources` exist, but the point API is missing |
| `private-endpoint-point-only` | yes | Only the point private endpoint connection API is present |
| `private-endpoint-list-only` | yes | Only the private endpoint connection collection API is present |
| `private-link-only` | yes | Only the `privateLinkResources` API is present |
| `compliant` | no | All three required private endpoint API shapes are present |
| `no-private-endpoints` | no | Standard ARM service without private endpoints stays out of scope |
