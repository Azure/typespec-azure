---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Extend `arm-resource-operation-response` to require an ARM PUT request body and reuse of one registered ARM resource model across the request and 200/201 response bodies, without adding a separately configured rule.

Ignore bodyless response variants, including explicit `void` bodies, when checking the remaining resource responses.

Disable the expanded rule in the default resource-manager ruleset pending rollout to existing ARM specifications. Enable `@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response` explicitly to opt in to both the lifecycle response and consolidated PUT body checks.
