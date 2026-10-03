---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add selected-version views and dependency-neutral, per-occurrence logical name customization to `resolveArmResources`, including synthetic resources identified by their default name or ARM instance path. The existing no-options call continues to return the multi-version declaration view.
