---
changeKind: feature
packages:
  - "@azure-tools/typespec-metadata"
---

Update Java namespace to apply the correct Azure prefix based on service type and flavor:
- `com.azure.` for current data plane services
- `com.azure.resourcemanager.` for current ARM/management services
- `com.azure.v2.` for next-gen data plane services (flavor: `azurev2`)
- `com.azure.resourcemanager.v2.` for next-gen ARM services (flavor: `azurev2`)
