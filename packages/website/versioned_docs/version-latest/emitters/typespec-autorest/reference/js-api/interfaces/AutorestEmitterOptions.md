---
jsApi: true
title: "[I] AutorestEmitterOptions"

---
## Properties

| Property | Type | Description |
| :------ | :------ | :------ |
| `arm-types-dir?` | `string` | Path to the common-types.json file folder.<br /><br />**Default**<br />` "${project-root}/../../common-types/resource-management" ` |
| `azure-resource-provider-folder?` | `string` | - |
| `examples-directory?` | `string` | Directory where the examples are located.<br /><br />**Default**<br />`{cwd}/examples` |
| `include-x-typespec-name?` | `"never"` \| `"inline-only"` | If the generated openapi types should have the `x-typespec-name` extension set with the name of the TypeSpec type that created it.<br />This extension is meant for debugging and should not be depended on.<br /><br />**Default**<br />` "never" ` |
| `new-line?` | `"lf"` \| `"crlf"` | Set the newline character for emitting files.<br /><br />**Default**<br />` lf ` |
| `omit-unreachable-types?` | `boolean` | Omit unreachable types.<br />By default all types declared under the service namespace will be included. With this flag on only types references in an operation will be emitted. |
| ~~`output-dir?`~~ | `string` | **Deprecated**<br />DO NOT USE. Use built-in emitter-output-dir instead |
| `output-file?` | `string` | Name of the output file.<br />Output file will interpolate the following values:<br /> - service-name: Name of the service if multiple<br /> - version: Version of the service if multiple<br /> - azure-resource-provider-folder: Value of the azure-resource-provider-folder option<br /> - version-status: Only enabled if azure-resource-provider-folder is set. `preview` if version contains preview, stable otherwise.<br /><br />**Default**<br />`{azure-resource-provider-folder}/{service-name}/{version-status}/{version}/openapi.json`<br /><br />**Example**<br />` Single service no versioning  - `openapi.yaml` `<br /><br />**Example**<br />` Multiple services no versioning  - `openapi.Org1.Service1.yaml`  - `openapi.Org1.Service2.yaml` `<br /><br />**Example**<br />` Single service with versioning  - `openapi.v1.yaml`  - `openapi.v2.yaml` `<br /><br />**Example**<br />` Multiple service with versioning  - `openapi.Org1.Service1.v1.yaml`  - `openapi.Org1.Service1.v2.yaml`  - `openapi.Org1.Service2.v1.0.yaml`  - `openapi.Org1.Service2.v1.1.yaml` `<br /><br />**Example**<br />` azureResourceProviderFolder is provided  - `arm-folder/AzureService/preview/2020-01-01.yaml`  - `arm-folder/AzureService/preview/2020-01-01.yaml` ` |
| `use-read-only-status-schema?` | `boolean` | Determines whether to transmit the 'readOnly' property to lro status schemas.<br /><br />**Default**<br />` false ` |
| `version?` | `string` | - |
