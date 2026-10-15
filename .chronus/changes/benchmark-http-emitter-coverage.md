---
changeKind: fix
packages:
  - "@azure-tools/typespec-benchmark"
---

Expand HTTP client emitter coverage on built-in specs and Azure services, including Go and npm-installed Azure C#. Include OpenAPI3 on every built-in spec; exclude it from Azure services because of incompatible Azure-specific routes. Temporarily exclude Azure TypeScript on Network because of a client-group naming collision. Require complete configured-emitter timings and record the published C# versions.
