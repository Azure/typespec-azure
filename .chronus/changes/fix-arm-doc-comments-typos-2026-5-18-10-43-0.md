---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Fix doc comment typos in ARM library: list operations incorrectly said "patched", CreateOrReplace operations said "createOrUpdate", extension operations had `>` instead of `.`, and @doc tag had malformed string interpolation.
