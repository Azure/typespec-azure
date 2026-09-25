---
changeKind: feature
packages:
  - "@azure-tools/typespec-autorest"
---

Add an `examples-format` option that lets the emitter read the unified `examples.yaml` format and materialize the legacy `x-ms-examples` files for the emitted API version. `"auto"` (default) uses `examples.yaml` when present and otherwise loads the legacy per-version JSON files. Materialized files follow the Azure naming convention (`<OperationId>.json`, keyed by `<OperationId>`) and honor the original file name and key when preserved in `examples.yaml`, so the rollout keeps the specs-repo diff minimal without changing downstream consumers.
