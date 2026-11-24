---
changeKind: feature
packages:
  - "@azure-tools/typespec-go"
---

The `lro-metadata-pollers` emitter option enables access to `@lroStatusMetadata` and `@lroOperationId` on generated pollers. Enabling it changes the return type of `Begin` methods for annotated operations and can break existing Go SDK consumers. A body operation ID takes precedence over a polling URL ID after it is received. Status metadata is empty after resuming until the next poll; operation IDs from a polling URL are also available after the next poll. Status-monitor models and their reachable types may gain output deserialization support.
