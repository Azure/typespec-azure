---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add the @dynamicModel decorator in Azure.ClientGenerator.Core to provide opt-in dynamic-model metadata for models or namespaces, with optional language scoping. Dynamic-model generation is currently supported only by the C# emitter; the shared decorator provides opt-in metadata pending emitter adoption and does not itself generate JSON Patch fields.