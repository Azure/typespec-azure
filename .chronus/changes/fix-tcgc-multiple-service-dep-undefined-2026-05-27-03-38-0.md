---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix "Cannot read properties of undefined" crash in the `inconsistent-multiple-service-dependency` validation when a service merged into a multi-service client does not specify a version for a depended library (e.g. its latest service version has no matching `@useDependency` entry). The validation now falls back to the latest version of the depended library, matching the behavior of downstream emitters.
