---
jsApi: true
title: "[I] ResolvedAutorestCanonicalEmitterOptions"

---
## Properties

| Property | Type | Description |
| :------ | :------ | :------ |
| `armTypesDir` | `string` | Arm types dir |
| `azureResourceProviderFolder?` | `string` | - |
| `includeXTypeSpecName` | `"never"` \| `"inline-only"` | If the x-typespec-name extension should be included |
| `newLine?` | `"lf"` \| `"crlf"` | Set the newline character for emitting files.<br /><br />**Default**<br />` lf ` |
| `omitUnreachableTypes?` | `boolean` | Omit unreachable types.<br />By default all types declared under the service namespace will be included. With this flag on only types references in an operation will be emitted. |
| `outputDir` | `string` | - |
| `outputFile` | `string` | - |
