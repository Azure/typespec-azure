---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Extend `arm-resource-operation-response` to require a request body matching the registered resource model for all registered PUT create-or-update operations, including legacy templates and multiple aliases. Respect request visibility and validate actual HTTP success payloads, including unregistered response models, against the canonical resource while accepting paged items and discriminated resource variants.

Add `arm-put-response-resource` to check Azure resource metadata on ARM PUT 200/201 response payloads, including custom PUT operations. The new rule is opt-in in the shared `resource-manager` ruleset; the existing `arm-resource-operation-response` rule remains enabled.
