---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Allow `@override` to replace a client method response and add the `replaceResponseWithVoid` and `replaceResponseWithBytes` customization functions. Report response type mismatches as errors and intentional `void` or `bytes` replacements as warnings.
