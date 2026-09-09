---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix `resolveArmResources` resource identity detection to seed resources from strict ARM resource instance paths instead of inferring resource IDs from list or action operation paths.
