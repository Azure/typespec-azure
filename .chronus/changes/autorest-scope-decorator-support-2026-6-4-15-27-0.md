---
changeKind: feature
packages:
  - "@azure-tools/typespec-autorest"
---

Add support for the `@scope` TCGC decorator. Operations, model properties, and parameters that are scoped out of the autorest emitter are now omitted from the generated swagger output.
