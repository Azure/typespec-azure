---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add multiple services support per design doc. Key changes:

- **New `apiVersionsMap` property on `SdkClientType`**: A `Record<string, string[]>` mapping service namespace full qualified names to their API versions. Empty for single-service clients, populated for cross-service clients.
- **Scenario 0 (Breaking)**: When multiple `@service` namespaces exist without explicit `@client`, TCGC now creates a separate root client for each service instead of only using the first one. The `multiple-services` warning is removed.
- **Scenario 1**: Explicit `@client` with empty namespace targeting a single service now auto-merges the service's operation groups into the client.
- **Scenario 1.5**: Support mixing multi-service and single-service clients in the same package.
- **Scenario 2**: Support nested `@client` decorators within multi-service client namespaces. Nested clients become children of the root multi-service client.
- **Updated versioning mutation**: Properly handles multiple independent services and mixed multi/single-service client configurations.

**Migration guide for breaking change (Scenario 0)**:
Previously, when multiple `@service` namespaces existed without an explicit `@client` decorator, only the first service was used and a warning was emitted. Now, a separate root client is created for each service. If you relied on the old behavior of ignoring additional services, you should either:
1. Remove the extra `@service` declarations, or
2. Add explicit `@client` decorators to control the client structure.
