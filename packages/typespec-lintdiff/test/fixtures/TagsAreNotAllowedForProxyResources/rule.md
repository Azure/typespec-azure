---
validatorRuleId: TagsAreNotAllowedForProxyResources
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/tags-are-not-allowed-for-proxy-resources
coverageKind: lint
---

# TagsAreNotAllowedForProxyResources

**Severity:** error

**Applies to:** Resource Manager (ARM)

Proxy resources must not have a tags property.

This rule is now covered by
`tsp-lintdiff-local-linter/tags-are-not-allowed-for-proxy-resources`, which
reports proxy resource properties bags that declare a top-level `tags`
property.

| ID                | Violation | Description                                    |
| ----------------- | --------- | ---------------------------------------------- |
| `proxy-with-tags` | true      | Proxy resource includes tags in properties bag |
