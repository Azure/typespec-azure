---
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
---

Preserve existing `service.yaml` versions when updating an existing manifest. Versions the emitter no longer produces (for example legacy swagger-only versions migrated from `readme.md`) are now kept instead of being removed, so re-running the emitter is idempotent for manifests that carry historical versions.
