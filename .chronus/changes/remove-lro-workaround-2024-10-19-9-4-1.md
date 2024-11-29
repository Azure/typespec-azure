---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

1. Introduce new usage: `LroInitial`, `LroPolling`, `LroFinalEnvelope`.
2. usage and access now properly propagate on polling model, final result and final envelop result of `lroMetadata`.
