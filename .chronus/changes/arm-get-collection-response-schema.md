---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Extend `arm-resource-operation-response` to compare collection GET response items with the actual corresponding individual GET response, including custom envelopes and hand-authored ARM routes.
