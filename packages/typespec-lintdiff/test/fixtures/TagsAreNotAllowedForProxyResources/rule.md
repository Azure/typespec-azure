---
validatorRuleId: TagsAreNotAllowedForProxyResources
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/tags-are-not-allowed-for-proxy-resources
coverageKind: lint
projectionScope: http-reachable
---

# TagsAreNotAllowedForProxyResources

**Severity:** error

**Applies to:** Resource Manager (ARM)

Proxy resources must not have a tags property.

This rule is now covered by
`tsp-lintdiff-local-linter/tags-are-not-allowed-for-proxy-resources`, which
reports proxy resources that declare `tags` on either the resource envelope or
the resource properties bag.

| ID                         | Violation | Description                                    |
| -------------------------- | --------- | ---------------------------------------------- |
| `proxy-with-tags`          | true      | Proxy resource includes tags in properties bag |
| `proxy-with-envelope-tags` | true      | Proxy resource includes tags on its envelope   |
| `proxy-without-tags`       | false     | Proxy resource has no tags                     |
| `tracked-with-tags`        | false     | Tracked resource uses its supported tags       |
