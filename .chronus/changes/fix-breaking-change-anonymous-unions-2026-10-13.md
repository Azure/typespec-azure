---
changeKind: fix
packages:
  - "@azure-tools/typespec-breaking-change"
---

Prevent false same-version breaking-change findings when identical anonymous union variants contain intrinsic types. Preserve source declaration identities alongside operation-relative wire identities in reports, and generate suppression guidance against the correct declaration or operation path.
