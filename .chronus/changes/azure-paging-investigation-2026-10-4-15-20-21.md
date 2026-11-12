---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-rulesets"
---

Enable the Azure Core `list-response-envelope` rule in the `data-plane` ruleset and the combined ARM `list-response-envelope` rule in the `resource-manager` ruleset. Both warn on `@continuationToken`; the ARM ruleset also enables the previously opt-in response-envelope checks. The core variant is disabled in the ARM ruleset to avoid duplicate token warnings.