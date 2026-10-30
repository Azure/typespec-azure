---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `no-nested-system-data` lint rule to keep system data in the ARM resource envelope rather than inside properties bags, including inherited dictionary values and discriminated payload alternatives. Include it in the ARM library's `all` ruleset while keeping it disabled in the recommended `resource-manager` ruleset.
