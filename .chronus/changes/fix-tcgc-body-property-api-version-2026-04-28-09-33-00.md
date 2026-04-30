---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix wrong API version param judgement: a body model property whose name matches `apiVersion`/`api-version` is no longer incorrectly flagged as `isApiVersionParam` with a service-derived `clientDefaultValue`. Only operation parameters can be considered API version parameters.
