---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Add the `no-unsupported-patch-properties` ARM linter rule, which reports writable resource identity, location, and provisioning state properties in PATCH request bodies. Register the rule as disabled by default in the ARM ruleset.
