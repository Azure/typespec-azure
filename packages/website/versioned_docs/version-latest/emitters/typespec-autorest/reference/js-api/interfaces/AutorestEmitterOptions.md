---
jsApi: true
title: "[I] AutorestEmitterOptions"

---
## Properties

| Property | Type | Description |
| :------ | :------ | :------ |
| `arm-types-dir?` | `string` | <p>Path to the common-types.json file folder.</p><p>**Default**</p><code>"${project-root}/../../common-types/resource-management"</code> |
| `azure-resource-provider-folder?` | `string` | - |
| `emit-lro-options?` | `"all"` \| `"none"` \| `"final-state-only"` | <p>Determines whether and how to emit the x-ms-long-running-operation-options</p><p>**Default**</p><code>"final-state-only"</code> |
| `examples-directory?` | `string` | <p>Directory where the examples are located.</p><p>**Default**</p><p>`{cwd}/examples`</p> |
| `include-x-typespec-name?` | `"never"` \| `"inline-only"` | <p>If the generated openapi types should have the `x-typespec-name` extension set with the name of the TypeSpec type that created it. This extension is meant for debugging and should not be depended on.</p><p>**Default**</p><code>"never"</code> |
| `new-line?` | `"lf"` \| `"crlf"` | <p>Set the newline character for emitting files.</p><p>**Default**</p><code>lf</code> |
| `omit-unreachable-types?` | `boolean` | Omit unreachable types. By default all types declared under the service namespace will be included. With this flag on only types references in an operation will be emitted. |
| ~~`output-dir?`~~ | `string` | <p>**Deprecated**</p><p>DO NOT USE. Use built-in emitter-output-dir instead</p> |
| `output-file?` | `string` | <p>Name of the output file. Output file will interpolate the following values:</p><ul><li>service-name: Name of the service if multiple</li><li>version: Version of the service if multiple</li><li>azure-resource-provider-folder: Value of the azure-resource-provider-folder option</li><li>version-status: Only enabled if azure-resource-provider-folder is set. `preview` if version contains preview, stable otherwise.</li></ul><p>**Default**</p><p>`{azure-resource-provider-folder}/{service-name}/{version-status}/{version}/openapi.json`</p><p>**Examples**</p><code>Single service no versioning<ul><li>`openapi.yaml`</li></ul></code><code>Multiple services no versioning<ul><li>`openapi.Org1.Service1.yaml`</li><li>`openapi.Org1.Service2.yaml`</li></ul></code><code>Single service with versioning<ul><li>`openapi.v1.yaml`</li><li>`openapi.v2.yaml`</li></ul></code><code>Multiple service with versioning<ul><li>`openapi.Org1.Service1.v1.yaml`</li><li>`openapi.Org1.Service1.v2.yaml`</li><li>`openapi.Org1.Service2.v1.0.yaml`</li><li>`openapi.Org1.Service2.v1.1.yaml`</li></ul></code><code>azureResourceProviderFolder is provided<ul><li>`arm-folder/AzureService/preview/2020-01-01.yaml`</li><li>`arm-folder/AzureService/preview/2020-01-01.yaml`</li></ul></code> |
| `use-read-only-status-schema?` | `boolean` | <p>Determines whether to transmit the 'readOnly' property to lro status schemas.</p><p>**Default**</p><code>false</code> |
| `version?` | `string` | - |
| `version-enum-strategy?` | `"include"` \| `"omit"` | <p>Decide how to deal with the Version enum when when `omit-unreachable-types` is not set.</p><p>**Default**</p><code>"omit"</code> |
