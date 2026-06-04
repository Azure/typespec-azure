---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
---

Introduce `MergePatch` function for use in templates.

```typespec
model MyPatchBody is MergePatch<MyResource, templateRenamer("{name}Patch")>;
```

Adds a simplified MergePatch template that takes a model and a rename function, returning a transformed model with:
- All properties made optional (except discriminator properties)
- Default values removed
- Only updatable properties included
- Nested model types recursively transformed
- Record value types recursively transformed
- Array item types left unchanged

Also adds `templateRenamer` and `mapRenamer` helper functions for naming transformed types.
