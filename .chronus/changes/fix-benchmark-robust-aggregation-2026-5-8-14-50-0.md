---
changeKind: fix
packages:
  - "@azure-tools/typespec-benchmark"
---

Improve benchmark result stability by using outlier-resistant runtime aggregation (trimmed mean for 5+ iterations and median for smaller samples), run specs in a deterministic order, and increase CI benchmark measured iterations from 5 to 15 for stronger statistical confidence.
