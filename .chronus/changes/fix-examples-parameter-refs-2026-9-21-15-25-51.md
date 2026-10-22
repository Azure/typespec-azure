---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-examples"
---

Validate example request and response values against the current TypeSpec API, including required and typed server parameters, with API-version and YAML-location diagnostics. Use `--schema-only` for format-only validation.

```sh
tsp-examples validate path/to/project
```