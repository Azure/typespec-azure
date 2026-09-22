---
changeKind: fix
packages:
  - "@azure-tools/typespec-benchmark"
---

Keep measurement time separate from source commit time and order published history and latest baselines by Git ancestry. Reject CLI comparisons between incompatible measurement methods. Use a fresh worktree for each backfilled commit and forward compiler noise settings consistently.
