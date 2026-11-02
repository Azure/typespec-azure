---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Return the resource or completion response body by default for resource lifecycle LROs, add scoped `@clientLroResult` selections for protocol response bodies and established status-monitor result properties, and warn on resource-operation compatibility overrides with `use-valid-client-lro-result`.
