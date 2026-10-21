---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Load unified YAML examples through the shared resolver, falling back to legacy JSON when no YAML is present. An explicit examples-dir continues to select JSON.

```yaml
Widgets.get:
  - request: {}
    responses: {200: {body: example}}
```