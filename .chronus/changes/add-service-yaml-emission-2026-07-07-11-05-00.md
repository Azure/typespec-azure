---
changeKind: feature
packages:
  - "@azure-tools/typespec-autorest"
---

Add `service-yaml` emitter option to generate a `service.yaml` manifest at the project root declaring the service's API versions (derived from the `@versioned` enum). The option controls emission: `"auto"` (default) writes the file only when it already exists, `"always"` always writes it, and `"never"` disables it.

```yaml
versions:
  - version: 2023-11-01
    source: typespec
    swagger-files:
      - resource-manager/Contoso/stable/2023-11-01/openapi.json
```
