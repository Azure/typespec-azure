---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-examples"
---

Add the `examples-migrate` tool that converts existing `x-ms-examples` JSON into the unified `examples.yaml` format (crawls versioned Swagger, normalizes `{api-version}`, and dedups across versions into `since` lineages).
