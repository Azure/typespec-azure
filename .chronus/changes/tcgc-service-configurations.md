---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Expose paired endpoint and OAuth configurations through `client.clientInitialization.serviceConfigurations` without changing existing HTTP-based client initialization. Each client reads the catalog declared on its first service, with the required `public` server first; SDK-namespace catalogs do not override it. Multi-service clients use the first service's endpoint, authentication, and configuration catalog without requiring equality across services.
