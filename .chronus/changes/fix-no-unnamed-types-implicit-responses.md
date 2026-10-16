---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-core"
---

Extend `no-unnamed-types` to report anonymous implicit response payloads, including aliases, intersections and response unions. Complete named-model spreads and metadata-only responses remain valid. This check uses the existing rule's enablement and suppression.
