---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add a `client-location-conflict` warning when `@clientLocation` moves multiple parameters with the same name but different types to the same client. This commonly happens when `@clientLocation` is applied to a templated parameter that is instantiated with different types, which previously produced a broken, hard-to-understand client. Move the parameter on each operation instead so it has a consistent type on the client.
