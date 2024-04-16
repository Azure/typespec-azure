---
jsApi: true
title: "[I] AutorestCanonicalEmitterOptions"

---
## Properties

| Property | Type | Description |
| :------ | :------ | :------ |
| `azure-resource-provider-folder?` | `string` | - |
| `include-x-typespec-name?` | `"never"` \| `"inline-only"` | If the generated openapi types should have the `x-typespec-name` extension set with the name of the TypeSpec type that created it.<br />This extension is meant for debugging and should not be depended on.<br /><br />**Default**<br />` "never" ` |
| `new-line?` | `"lf"` \| `"crlf"` | Set the newline character for emitting files.<br /><br />**Default**<br />` lf ` |
| `omit-unreachable-types?` | `boolean` | Omit unreachable types.<br />By default all types declared under the service namespace will be included. With this flag on only types references in an operation will be emitted. |
| `output-file?` | `string` | Name of the output file.<br />Output file will interpolate the following values:<br /> - service-name: Name of the service if multiple<br /> - version: Version of the service if multiple<br /> - azure-resource-provider-folder: Value of the azure-resource-provider-folder option<br /><br />**Default**<br />`{azure-resource-provider-folder}/{service-name}/{version}/openapi.json`<br /><br />**Example**<br />` Single service no versioning  - `canonical.openapi.json` `<br /><br />**Example**<br />` Multiple services no versioning  - `Service1.canonical.openapi.json`  - `Service2.canonical.openapi.json` `<br /><br />**Example**<br />` Single service with versioning  - `canonical.openapi.json` `<br /><br />**Example**<br />` Multiple service with versioning  - `Service1.canonical.openapi.json`  - `Service2.canonical.openapi.json` ` |
