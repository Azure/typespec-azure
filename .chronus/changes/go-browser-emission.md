---
changeKind: feature
packages:
  - "@azure-tools/typespec-go"
---

Support generating Go clients in the browser playground using its virtual filesystem.
Browser generation skips native Go formatting, module tidying, and post-generation transformations.
Command-line generation is unchanged.

```yaml
emit:
  - "@azure-tools/typespec-go"
options:
  "@azure-tools/typespec-go":
    module: example.com/playground
```
