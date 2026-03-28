---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-azure-rulesets"
---

Add `no-route-parameter-name-mismatch` linting rule that detects when two operation routes differ only by path parameter name. Operations with `allowReserved` path parameters are excluded from this check.
