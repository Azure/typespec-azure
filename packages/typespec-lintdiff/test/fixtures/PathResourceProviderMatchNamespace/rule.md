---
validatorRuleId: PathResourceProviderMatchNamespace
engine: native
tspLints: []
coverageKind: template
---

# PathResourceProviderMatchNamespace

**Severity:** error

**Applies to:** Resource Manager (ARM)

The provider namespace in the resource path must match the namespace the specification belongs to.

TypeSpec ARM templates usually generate provider paths from the declared ARM namespace, but a
manual path can still violate this rule. Because we do not have a verified native TypeSpec lint
for the mismatch and we have not yet proven a local raw-path case that reliably triggers this
validator rule in the harness, this rule is template-protected but still lacks a non-template
native backstop.
