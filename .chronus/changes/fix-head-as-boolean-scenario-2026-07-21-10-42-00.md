---
changeKind: fix
packages:
  - "@azure-tools/azure-http-specs"
---

Fix `ResponseAsBool_HeadAsBoolean` scenario coverage always failing. Split it into two scenarios (`exists` and `notExists`) so the intentional `404` response of `notExists` is validated with `passOnCode(404)` instead of `passOnSuccess` (which requires all endpoints to return 2xx). Endpoint paths are unchanged.
