---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Extend `arm-resource-operation-response` to require a request body matching the registered resource model for all registered PUT create-or-update operations, including legacy templates and multiple aliases. Respect request visibility when resolving effective payload types.

Keep the existing rule enabled and lifecycle/list response validation unchanged. Custom HTTP PUT operations without ARM lifecycle registration are outside this request check; operation registration remains the responsibility of `use-operation-decorator`. This replaces the broader proposed request/200/201 comparison and arbitrary payload-registration checks.
