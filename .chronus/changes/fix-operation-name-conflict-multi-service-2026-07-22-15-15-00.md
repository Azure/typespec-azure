---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Detect operation name conflicts when multiple services are combined into one client via `@client({service: [ServiceA, ServiceB]})`. Previously only same-namespace duplicates were caught; now cross-service operation name collisions emit the existing `duplicate-client-name` diagnostic.
