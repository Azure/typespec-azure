---
changeKind: fix
packages:
  - "@azure-tools/typespec-metadata"
---

Fix incorrect Go package name parsing in `tspconfig.yaml`. The Go package name is now derived from the emitter output directory instead of the module path, which correctly excludes version suffixes (e.g., `/v4`) and uses the language-specific `service-dir` for accurate path resolution.
