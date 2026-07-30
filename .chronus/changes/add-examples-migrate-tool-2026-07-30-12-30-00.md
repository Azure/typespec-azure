---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-examples"
---

Add the transitional `tsp-examples-migrate` tool that converts existing `x-ms-examples` JSON into the unified `examples.yaml` format (crawls versioned Swagger, normalizes `{api-version}`, dedups across versions into `since` lineages, and uses an adjacent `service.yaml` as the authoritative version list).
