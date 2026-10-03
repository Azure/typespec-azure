---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `no-tags-on-proxy-resource` lint rule for detecting unsupported envelope tags on non-tracked ARM resources, with a removal code fix for directly declared envelope tags. Resource-specific properties bags are not checked.
