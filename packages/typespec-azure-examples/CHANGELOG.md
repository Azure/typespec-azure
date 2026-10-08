# Changelog - @azure-tools/typespec-azure-examples



## 0.2.0

### Features

- [#5121](https://github.com/Azure/typespec-azure/pull/5121) Add the transitional `tsp-examples-legacy-expand` tool that expands the unified examples into the concrete example for each operation at a target API version (greatest `since <= target` per lineage, using the `service.yaml` order) and materializes the `{api-version}` placeholder.
- [#5120](https://github.com/Azure/typespec-azure/pull/5120) Add the transitional `tsp-examples-migrate` tool that converts existing `x-ms-examples` JSON into the unified `examples.yaml` format (crawls versioned Swagger, normalizes `{api-version}`, dedupes across versions into `since` lineages, and uses an adjacent `service.yaml` as the authoritative version list).
- [#4908](https://github.com/Azure/typespec-azure/pull/4908) Add `@azure-tools/typespec-azure-examples` with the `examples.yaml` JSON Schema and the `tsp-examples validate` command for the unified examples format.

