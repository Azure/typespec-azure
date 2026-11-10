---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Expose paired endpoint and OAuth configurations through `client.clientInitialization.serviceConfigurations`, keeping existing initialization fields aligned with the required `public` default. Child clients inherit the nearest catalog unless overridden. Multi-service clients use the first service's endpoint, authentication, and configuration catalog without requiring equality across services.
