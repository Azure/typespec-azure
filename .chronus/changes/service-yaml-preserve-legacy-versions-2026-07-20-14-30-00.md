---
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
---

Preserve non-TypeSpec `service.yaml` versions when updating an existing manifest. Versions the emitter no longer produces are now kept when they are not TypeSpec-generated (for example legacy swagger-only versions migrated from `readme.md`), while stale `source: typespec` versions the emitter no longer produces are still removed. This makes re-running the emitter idempotent for manifests that carry historical versions.
