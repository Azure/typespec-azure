---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Support a per-service `api-version` map for multi-service packages. The `api-version` emitter option now accepts either a string (applied to single service packages, or the `latest`/`all` keywords) or a map from each service namespace's full name to its desired version. Services not listed in the map default to their latest version.
