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
- management-group extension PUT whose emitted path begins with `/providers` => invalid
- PUT at the exact `/providers` path => invalid
- PUT ending in `/operations` => valid
- subscription-scoped ARM resource with create-or-update/PUT => valid
- extension resource create-or-update/PUT under `/{resourceUri}/providers/...` => valid
- tenant-scoped ARM resource without create-or-update/PUT => valid

## Test Cases

| ID                               | Violation | Description                                                              |
| -------------------------------- | --------- | ------------------------------------------------------------------------ |
| `tenant-level-put`               | yes       | Tenant-scoped proxy resource defines a create-or-update PUT              |
| `tenant-level-custom-put`        | yes       | Tenant-scoped proxy resource defines a custom PUT operation              |
| `management-group-extension-put` | yes       | Management-group extension PUT emits a path beginning with `/providers`  |
| `providers-root-put`             | yes       | PUT path is exactly `/providers`                                         |
| `operations-put`                 | no        | Explicit PUT ending in `/operations` exercises the upstream exemption    |
| `subscription-level-put`         | no        | Subscription-scoped proxy resource create-or-update is outside this rule |
| `extension-resource-put`         | no        | Extension resource create-or-update is outside this rule                 |
| `tenant-level-no-put`            | no        | Tenant-scoped resource without create-or-update remains compliant        |
