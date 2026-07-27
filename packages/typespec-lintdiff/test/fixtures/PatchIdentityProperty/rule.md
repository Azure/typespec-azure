---
validatorRuleId: PatchIdentityProperty
engine: spectral
coverageKind: template
tspTemplateLints:
  - '@azure-tools/typespec-azure-resource-manager/arm-resource-operation'
---

# PatchIdentityProperty

**Severity:** error

**Applies to:** Resource Manager (ARM)

If a resource exposes the top-level `identity` envelope property, PATCH must expose that same
property in the request body.

## Semantic coverage notes

- Upstream `PatchIdentityProperty` only checks for the presence of the top-level `identity`
  property in the PATCH body when the PATCH or GET response schema contains `identity`.
- Standard ARM resource templates already preserve that envelope property: spreading
  `ManagedServiceIdentityProperty` onto a resource makes `identity` part of the resource shape,
  and `ArmResourcePatchAsync` reuses the resource shape as the PATCH payload.
- The local violating fixture therefore models a raw ARM-style PATCH operation outside the
  standard `@armResourceOperations` template path, and
  `@azure-tools/typespec-azure-resource-manager/arm-resource-operation` is the proxy signal
  that the author has stepped outside the template that would have kept `identity` in sync.

| ID                          | Violation | Description                                          |
| --------------------------- | --------- | ---------------------------------------------------- |
| `identity-required-subprops`| true      | Raw ARM-style PATCH body omits top-level `identity` even though the resource response model includes it |
