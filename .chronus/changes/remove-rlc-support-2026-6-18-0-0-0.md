---
changeKind: breaking
packages:
  - "@azure-tools/typespec-ts"
---

Remove RLC (Rest Level Client) generation support. The emitter now always generates a Modular library, so the `is-modular-library` option has been removed (it is treated as always `true`). The following deprecated RLC-legacy options have also been removed: `include-shortcuts`, `multi-client`, `batch`, `azure-output-directory`, `title`, `dependency-info`, `product-doc-link`, `service-info`, and `default-value-object`.
