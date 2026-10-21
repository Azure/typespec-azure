---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-core"
---

Extend `no-unnamed-types` to report anonymous implicit response payloads, including aliases, intersections, response unions and concrete operations inherited from interface templates. Complete named-model spreads and metadata-only responses remain valid. This check uses the existing rule's enablement and suppression.
