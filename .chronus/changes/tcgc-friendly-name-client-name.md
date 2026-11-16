---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Honor scoped `@clientName` overrides on source types when resolving `@friendlyName` templates by default. This can rename generated SDK models, including ARM list-result and PATCH request models, and is a breaking naming change.

To preserve previous names for individual services, set `use-client-name-for-friendly-name-source` to `false` under the SDK emitter's options in the service's `tspconfig.yaml`. Emitters can expose this shared emitter option in their schema, and `createSdkContext` respects it when building the SDK package. The option defaults to `true` and does not affect explicit `@clientName` overrides on the target type.
