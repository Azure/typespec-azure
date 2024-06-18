---
jsApi: true
title: "[I] AutorestDocumentEmitterOptions"

---
Options to configure the behavior of the Autorest document emitter.

## Properties

| Property | Modifier | Type | Description |
| :------ | :------ | :------ | :------ |
| `armTypesDir` | `readonly` | `string` | Arm types dir |
| `emitLroOptions?` | `readonly` | `"all"` \| `"none"` \| `"final-state-only"` | <p>Determines whether and how to emit x-ms-long-running-operation-options to describe resolution of asynchronous operations</p><p>**Default**</p><code>"final-state-only"</code> |
| `examplesDirectory?` | `readonly` | `string` | - |
| `includeXTypeSpecName` | `readonly` | `"never"` \| `"inline-only"` | If the x-typespec-name extension should be included |
| `omitUnreachableTypes?` | `readonly` | `boolean` | Omit unreachable types. By default all types declared under the service namespace will be included. With this flag on only types references in an operation will be emitted. |
| `useReadOnlyStatusSchema?` | `readonly` | `boolean` | readOnly property schema behavior |
| `versionEnumStrategy?` | `readonly` | `"include"` \| `"omit"` | <p>Decide how to deal with the version enum when `omitUnreachableTypes` is not set.</p><p>**Default**</p><code>"omit"</code> |
