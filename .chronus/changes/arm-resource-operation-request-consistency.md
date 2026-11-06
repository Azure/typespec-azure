---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Extend `arm-resource-operation-response` to require a request body matching the registered resource model for all registered PUT create-or-update operations, including legacy templates and multiple aliases. Respect request visibility and validate actual HTTP success payloads, including unregistered response models, against the canonical resource while accepting paged items and discriminated resource variants.

Use `resolveArmResources` to check that ARM PUT 200/201 success payloads are native resource models, including custom and action operations, without inspecting OpenAPI extensions. Consolidate this validation into the existing enabled `arm-resource-operation-response` rule and avoid duplicate response diagnostics. This extends the shared `resource-manager` ruleset's PUT response guidance.
