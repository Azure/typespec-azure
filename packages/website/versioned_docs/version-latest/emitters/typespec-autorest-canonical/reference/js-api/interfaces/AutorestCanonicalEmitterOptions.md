---
jsApi: true
title: "[I] AutorestCanonicalEmitterOptions"

---
## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| `arm-types-dir?` | `string` | Path to the common-types.json file folder. **Default** `"${project-root}/../../common-types/resource-management"` |
| `azure-resource-provider-folder?` | `string` | - |
| `include-x-typespec-name?` | `"never"` \| `"inline-only"` | If the generated openapi types should have the `x-typespec-name` extension set with the name of the TypeSpec type that created it. This extension is meant for debugging and should not be depended on. **Default** `"never"` |
| `new-line?` | `"lf"` \| `"crlf"` | Set the newline character for emitting files. **Default** `lf` |
| `omit-unreachable-types?` | `boolean` | Omit unreachable types. By default all types declared under the service namespace will be included. With this flag on only types references in an operation will be emitted. |
| `output-file?` | `string` | Name of the output file. Output file will interpolate the following values: - service-name: Name of the service if multiple - version: Version of the service if multiple - azure-resource-provider-folder: Value of the azure-resource-provider-folder option **Default** `{azure-resource-provider-folder}/{service-name}/canonical/openapi.json` **Examples** `Single service no versioning - `canonical.openapi.json`` `Multiple services no versioning - `Service1.canonical.openapi.json` - `Service2.canonical.openapi.json`` `Single service with versioning - `canonical.openapi.json`` `Multiple service with versioning - `Service1.canonical.openapi.json` - `Service2.canonical.openapi.json`` |
