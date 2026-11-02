---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `no-unsafe-patch-body-properties` ARM linter rule, migrating `ConsistentPatchProperties`, `UnSupportedPatchProperties`, and `PatchBodyParametersSchema` checks.

Require PATCH input to be a partial resource shape without immutable fields, defaults, required properties outside replacement array elements, or exposed properties lacking Update visibility. Compare associated resource models or unambiguous PATCH and same-service GET responses; independent input-safety checks still apply when no comparison resource is available.

Respect effective HTTP payload properties, inherited and encoded names, and resource record keys. Exclude multipart and native or derived file payloads. The rule applies ARM guidance to project PATCH operations throughout a compilation, without requiring `@armProviderNamespace`; whole-model assignability and exact Swagger diagnostic equivalence are not required.
