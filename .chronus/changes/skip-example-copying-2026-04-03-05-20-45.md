---
changeKind: feature
packages:
  - "@azure-tools/typespec-autorest"
---

Added `skip-example-copying` emitter option. When enabled, example files are not copied to the output directory and `x-ms-examples` `$ref` values point directly to the source example files via relative paths.
