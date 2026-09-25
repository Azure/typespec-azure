---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
  - "@azure-tools/typespec-azure-rulesets"
---

Add the `use-union-hierarchy` linter rule to require named unions to declare an `extends` constraint and model variants to inherit from the declared base and belong to only one model-based union hierarchy, enabled by the `client-sdk` ruleset.
