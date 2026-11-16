---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Honor scoped `@clientName` overrides on source types when resolving `@friendlyName` templates by default. This can rename generated SDK models, including ARM list-result and PATCH request models, and is a breaking naming change.

To preserve previous names, set `useClientNameForFriendlyNameSource: false` in the options passed to `createSdkContext` or `createTCGCContext`. This flag defaults to `true` and does not affect explicit `@clientName` overrides on the target type.

For per-service mitigation, emitters can expose the shared `use-client-name-for-friendly-name-source` emitter option and set it to `false` under that emitter's options in the service's `tspconfig.yaml`. `createSdkContext` reads this option before building the SDK package, and it takes precedence over the API flag, allowing individual services to retain their previous names without changing the emitter's default for other services.
