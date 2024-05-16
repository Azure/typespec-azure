---
jsApi: true
title: "[I] AutorestDocumentEmitterOptions"

---
Options to configure the behavior of the Autorest document emitter.

## Properties

| Property | Modifier | Type | Description |
| :------ | :------ | :------ | :------ |
| `armTypesDir` | `readonly` | `string` | Arm types dir |
| `examplesDirectory?` | `readonly` | `string` | - |
| `includeXTypeSpecName` | `readonly` | `"never"` \| `"inline-only"` | If the x-typespec-name extension should be included |
| `omitUnreachableTypes?` | `readonly` | `boolean` | Omit unreachable types.<br />By default all types declared under the service namespace will be included. With this flag on only types references in an operation will be emitted. |
| `useReadOnlyStatusSchema?` | `readonly` | `boolean` | readOnly property schema behavior |
| `versionEnumStrategy?` | `readonly` | `"include"` \| `"omit"` | Decide how to deal with the version enum when `omitUnreachableTypes` is not set.<br /><br />**Default**<br />` "omit" ` |
