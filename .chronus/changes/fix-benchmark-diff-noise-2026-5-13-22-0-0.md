---
changeKind: fix
packages:
  - "@azure-tools/typespec-benchmark"
---

Reduce noisy benchmark comparison regressions by requiring both the percentage threshold and a minimum absolute runtime delta (1ms) before a metric is flagged as notable.
