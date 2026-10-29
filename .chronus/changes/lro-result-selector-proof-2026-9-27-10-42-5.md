---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add scoped @clientLroResult selections of protocol-backed completion bodies and nested properties, with coherent result types and ordered extraction paths, paging validation, and diagnostics for invalid or protocol-changing selections. Language emitter support for consuming nested result paths is separate from TCGC metadata support.