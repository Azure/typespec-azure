---
changeKind: fix
packages:
  - "@azure-tools/typespec-benchmark"
---

Improve benchmark result stability by using outlier-resistant runtime aggregation (trimmed mean for 5+ iterations and median for smaller samples), and run specs in a deterministic order.
