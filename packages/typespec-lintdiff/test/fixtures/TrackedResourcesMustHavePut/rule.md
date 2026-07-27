---
validatorRuleId: TrackedResourcesMustHavePut
engine: native
tspLints:
  - tsp-lintdiff-local-linter/tracked-resources-must-have-put
---

# TrackedResourcesMustHavePut

**Severity:** error

**Applies to:** Resource Manager (ARM)

Tracked resources must have a put (createOrUpdate) operation defined.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `missing-put` | yes | TrackedResource with only get + delete, no createOrUpdate/put |
| `has-put-template` | no | TrackedResource with the standard createOrUpdate template operation |
| `has-manual-put` | no | TrackedResource with a custom `@put` operation decorated as `@armResourceCreateOrUpdate` |
| `proxy-without-put` | no | ProxyResource with no put operation should not trigger the tracked-resource rule |
