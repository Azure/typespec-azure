---
changeKind: fix
packages:
  - "@azure-tools/typespec-azurite-emitter-pilot"
---

Response metadata now carries the TS property name alongside the wire name for each header, so a real dispatcher can translate a handler's typed result back into HTTP headers; found while wiring a hand-written Express dispatcher against the generated metadata for the companion Azure/Azurite end-to-end PR.