---
changeKind: internal
packages:
  - "@azure-tools/typespec-ts"
---

Remove the derived `isVersionUserProvided` field from `PackageDetails` and stop defaulting `package-details.version` in the data model. The default (`1.0.0-beta.1`) is now applied at each consumption site instead.
