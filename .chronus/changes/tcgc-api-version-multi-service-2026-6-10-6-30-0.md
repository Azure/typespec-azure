---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Extend the `api-version` emitter option to accept a service-to-version mapping in addition to a single string. A string only applies to single-service specs, while a mapping (e.g. `{ "Service.A": "v1", "Service.B": "v2" }`) lets each service in a multi-service spec target a different version. Services not listed in the mapping default to their latest version.
