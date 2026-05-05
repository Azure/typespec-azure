---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Add new `arm-resource-required-operations` linting rule that ensures every ARM resource declares the complete set of required lifecycle and list operations (singleton-aware; supersedes `no-resource-delete-operation`). Extend `arm-resource-patch` with `requiredInPatch`, `notUpdateableInPatch`, `missingMergePatch`, and `nonMergePatchContentType` diagnostics, with codefixes for making PATCH properties optional, removing non-updateable properties, and adding `@patch(#{ implicitOptionality: true })`.
