---
jsApi: true
title: "[I] AutorestEmitterOptions"

---
## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| `arm-resource-flattening?` | `boolean` | Back-compat flag. If true, continue to emit `x-ms-client-flatten` in for some of the ARM resource properties. |
| `arm-types-dir?` | `string` | Path to the common-types.json file folder. **Default** `"${project-root}/../../common-types/resource-management"` |
| `azure-resource-provider-folder?` | `string` | - |
| `emit-common-types-schema?` | `"never"` \| `"for-visibility-changes"` | Determines whether and how to emit schemas for common-types **Default** `"for-visibility-changes"` |
| `emit-lro-options?` | `"all"` \| `"none"` \| `"final-state-only"` | Determines whether and how to emit the x-ms-long-running-operation-options **Default** `"final-state-only"` |
| `examples-directory?` | `string` | Directory where the examples are located. **Default** `{cwd}/examples` |
| `include-x-typespec-name?` | `"never"` \| `"inline-only"` | If the generated openapi types should have the `x-typespec-name` extension set with the name of the TypeSpec type that created it. This extension is meant for debugging and should not be depended on. **Default** `"never"` |
| `new-line?` | `"lf"` \| `"crlf"` | Set the newline character for emitting files. **Default** `lf` |
| `omit-unreachable-types?` | `boolean` | Omit unreachable types. By default all types declared under the service namespace will be included. With this flag on only types references in an operation will be emitted. |
| ~~`output-dir?`~~ | `string` | **Deprecated** DO NOT USE. Use built-in emitter-output-dir instead |
| `output-file?` | `string` | Name of the output file. Output file will interpolate the following values: - service-name: Name of the service if multiple - version: Version of the service if multiple - azure-resource-provider-folder: Value of the azure-resource-provider-folder option - version-status: Only enabled if azure-resource-provider-folder is set. `preview` if version contains preview, stable otherwise. **Default** `{azure-resource-provider-folder}/{service-name}/{version-status}/{version}/openapi.json` **Examples** `Single service no versioning - `openapi.yaml`` `Multiple services no versioning - `openapi.Org1.Service1.yaml` - `openapi.Org1.Service2.yaml`` `Single service with versioning - `openapi.v1.yaml` - `openapi.v2.yaml`` `Multiple service with versioning - `openapi.Org1.Service1.v1.yaml` - `openapi.Org1.Service1.v2.yaml` - `openapi.Org1.Service2.v1.0.yaml` - `openapi.Org1.Service2.v1.1.yaml`` `azureResourceProviderFolder is provided - `arm-folder/AzureService/preview/2020-01-01.yaml` - `arm-folder/AzureService/preview/2020-01-01.yaml`` |
| `use-read-only-status-schema?` | `boolean` | Determines whether to transmit the 'readOnly' property to lro status schemas. **Default** `false` |
| `version?` | `string` | - |
| `version-enum-strategy?` | `"include"` \| `"omit"` | Decide how to deal with the Version enum when when `omit-unreachable-types` is not set. **Default** `"omit"` |
