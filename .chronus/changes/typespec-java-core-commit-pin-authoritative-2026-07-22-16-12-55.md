---
changeKind: internal
packages:
  - "@azure-tools/typespec-java"
---

Make the `core-commit.json` pin authoritative in `CoreCommit.ps1`: always build the Java emitter from exactly the pinned core commit via `git archive` instead of gating on a `merge-base` ancestry check that a shallow CI clone cannot evaluate.
