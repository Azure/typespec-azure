---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-rulesets"
---

Add a new `client-sdk` ruleset and enable the `csharp-no-url-suffix` rule in it. The rule applies only to specs configured to emit a client SDK, i.e. those that extend `@azure-tools/typespec-azure-rulesets/client-sdk` in their `tspconfig.yaml`.
