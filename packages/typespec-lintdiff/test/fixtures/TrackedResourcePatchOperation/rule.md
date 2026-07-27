---
validatorRuleId: TrackedResourcePatchOperation
engine: native
tspLints:
- tsp-lintdiff-local-linter/tracked-resource-patch-operation
coverageKind: lint
---

# TrackedResourcePatchOperation

**Severity:** error

**Applies to:** Resource Manager (ARM)

Tracked resources must have a patch (update) operation defined.

This is now covered by a local TypeSpec lint that checks tracked ARM resources discovered through
ARM metadata and mirrors the upstream `privateEndpointConnectionProxies` exemption.

The local lint intentionally reasons over ARM-associated resource operations. A raw PATCH path that
is not modeled as an ARM resource update operation is not represented here; those shapes already
fall outside the standard ARM helper pattern and typically trigger separate ARM operation diagnostics.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `missing-patch` | yes | TrackedResource with get, createOrUpdate, delete but no patch |
| `missing-put-and-patch` | yes | TrackedResource with get and delete only still violates because PATCH is missing |
| `with-patch` | no | TrackedResource with a standard ARM PATCH/update operation is compliant |
| `patch-without-put` | no | The rule only requires PATCH; a resource can satisfy it even without PUT |
| `private-endpoint-connection-proxy-exempt` | no | `privateEndpointConnectionProxies` resources are explicitly exempt upstream |
| `proxy-resource-no-patch` | no | Proxy resources are out of scope even when they omit PATCH |
