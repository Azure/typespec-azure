---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-client-generator-core"
  - "@azure-tools/azure-http-specs"
---

Add `@azureServiceConfigurations` to pair named endpoints with OAuth URLs and scopes. Reuse HTTP `@server` for each endpoint and one `@useAuth` call with OR requirements, preserving AND groups and credential alternatives. Project client-local catalogs through TCGC while keeping existing initialization fields aligned with the explicit default, and reject inconsistent pairings when merging services. Retain enum-based Entra audience semantics and the authentication-catalog exception to the no-enum rule. Add shared audience and configuration Spector scenarios; language emitter adoption, challenge processing, and endpoint-derived audience resolution remain separate work.
