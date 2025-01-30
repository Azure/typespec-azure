---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Change `@clientInitialization` decorator's `options` parameter to `ClientInitializationOptions` type. The options now could set how to initialize the client. Though the implementation could support backward compatibility, it's better to have all specs that use this decorator change from `@clientInitialization(CustomizedOption)` to `@clientInitialization({parameters: CustomizedOption})`. A new helper `getClientInitializationOptions` is added for getting the new `ClientInitializationOptions` info from the `@clientInitialization` decorator.