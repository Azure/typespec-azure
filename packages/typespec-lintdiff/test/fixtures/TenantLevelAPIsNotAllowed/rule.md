---
validatorRuleId: TenantLevelAPIsNotAllowed
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/tenant-level-apis-not-allowed
tspRuleset: resource-manager
---

# TenantLevelAPIsNotAllowed

**Severity:** warning

**Applies to:** Resource Manager (ARM)

Tenant-scoped ARM resource PUT operations are not allowed.

## Semantic coverage notes

The authorable upstream semantic matrix covered locally is:

- tenant-scoped ARM resource with create-or-update/PUT => invalid
- tenant-scoped ARM resource with custom non-lifecycle PUT => invalid
- subscription-scoped ARM resource with create-or-update/PUT => valid
- extension resource create-or-update/PUT under `/{resourceUri}/providers/...` => valid
- tenant-scoped ARM resource without create-or-update/PUT => valid

The upstream operations-endpoint exemption (`/providers/.../operations`) is not modeled as a clean local fixture here.
TypeSpec's ARM `Operations` helper emits the standard GET list operation; authoring a PUT on that endpoint would
require custom out-of-pattern routing rather than normal ARM resource helpers.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `tenant-level-put` | yes | Tenant-scoped proxy resource defines a create-or-update PUT |
| `tenant-level-custom-put` | yes | Tenant-scoped proxy resource defines a custom PUT operation |
| `subscription-level-put` | no | Subscription-scoped proxy resource create-or-update is outside this rule |
| `extension-resource-put` | no | Extension resource create-or-update is outside this rule |
| `tenant-level-no-put` | no | Tenant-scoped resource without create-or-update remains compliant |
