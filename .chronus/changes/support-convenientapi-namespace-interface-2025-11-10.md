---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Support `@convenientAPI` and `@protocolAPI` decorators at namespace/interface level

The `@convenientAPI` and `@protocolAPI` decorators can now be applied to `namespace` and `interface` targets in addition to individual operations. This enables cleaner client.tsp files by allowing these decorators to be set at a higher level and inherited by all contained operations, with support for explicit overrides at the operation level.
