---
jsApi: true
title: "[I] AutorestCanonicalEmitterOptions"

---
## Properties

| Property | Type | Description |
| :------ | :------ | :------ |
| `arm-types-dir?` | `string` | <p>Path to the common-types.json file folder.</p><p>**Default**</p><code>"${project-root}/../../common-types/resource-management"</code> |
| `azure-resource-provider-folder?` | `string` | - |
| `include-x-typespec-name?` | `"never"` \| `"inline-only"` | <p>If the generated openapi types should have the `x-typespec-name` extension set with the name of the TypeSpec type that created it. This extension is meant for debugging and should not be depended on.</p><p>**Default**</p><code>"never"</code> |
| `new-line?` | `"lf"` \| `"crlf"` | <p>Set the newline character for emitting files.</p><p>**Default**</p><code>lf</code> |
| `omit-unreachable-types?` | `boolean` | Omit unreachable types. By default all types declared under the service namespace will be included. With this flag on only types references in an operation will be emitted. |
| `output-file?` | `string` | <p>Name of the output file. Output file will interpolate the following values:</p><ul><li>service-name: Name of the service if multiple</li><li>version: Version of the service if multiple</li><li>azure-resource-provider-folder: Value of the azure-resource-provider-folder option</li></ul><p>**Default**</p><p>`{azure-resource-provider-folder}/{service-name}/canonical/openapi.json`</p><p>**Examples**</p><code>Single service no versioning<ul><li>`canonical.openapi.json`</li></ul></code><code>Multiple services no versioning<ul><li>`Service1.canonical.openapi.json`</li><li>`Service2.canonical.openapi.json`</li></ul></code><code>Single service with versioning<ul><li>`canonical.openapi.json`</li></ul></code><code>Multiple service with versioning<ul><li>`Service1.canonical.openapi.json`</li><li>`Service2.canonical.openapi.json`</li></ul></code> |
