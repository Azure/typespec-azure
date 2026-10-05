---
changeKind: feature
packages:
  - "@azure-tools/typespec-azurite-emitter-pilot"
---

Validate the pilot emitter's generated artifacts against Azure/Azurite's real generated handler/dispatcher shapes (trailing context parameter on handler methods; required-parameter and per-status response metadata for dispatch), closing two gaps found during that comparison.