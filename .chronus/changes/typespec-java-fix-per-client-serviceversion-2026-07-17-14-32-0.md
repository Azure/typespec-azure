---
changeKind: fix
packages:
  - "@azure-tools/typespec-java"
---

Fix per-client `ServiceVersion` regression: multi-client packages whose clients share the same api-versions now generate a single shared `ServiceVersion` enum again, instead of a separate `<ClientName>ServiceVersion` per client. Per-client enums are still emitted when the api-versions genuinely differ.
