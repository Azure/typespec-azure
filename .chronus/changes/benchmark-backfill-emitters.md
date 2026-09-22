---
changeKind: fix
packages:
  - "@azure-tools/typespec-benchmark"
---

Restore the complete emitter setup when backfilling historical commits, including job-installed C#, and support replacing existing results with `--force`. Run in an isolated worktree, preserve failure logs, and publish historical results without rewinding the latest baseline or losing concurrent updates.
