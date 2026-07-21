---
changeKind: internal
packages:
  - "@azure-tools/typespec-java"
---

Read pinned `core/` sources with `git archive --format=zip` + `Expand-Archive` instead of `tar`, which failed on Windows.
