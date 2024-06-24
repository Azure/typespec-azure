---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest-canonical"
---

add option "use-read-only-status-schema" to fix ProvisioningStateMustBeReadOnly bug; 
add isArmCommonType check to avoid decorator validation in canonical emitter
