---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Change `@clientInitialization` decorator's `options` parameter to `ClientInitializationOptions` type. The options now could set the client initialization method's access and client accessor's access. This is a behavior breaking change for this decorator. All specs that use this decorator should change from `@clientInitialization(CustomizedOption)` to `@clientInitialization({parameters: CustomizedOption})`.