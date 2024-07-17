---
jsApi: true
title: "[I] AutorestDocumentEmitterOptions"

---
Options to configure the behavior of the Autorest document emitter.

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| `armResourceFlattening?` | `readonly` | `boolean` | readOnly property ARM resource flattening |
| `armTypesDir` | `readonly` | `string` | Arm types dir |
| `emitCommonTypesSchema?` | `readonly` | `"never"` \| `"for-visibility-changes"` | Determines whether and how to emit schema for arm common-types **Default** `"for-visibility-only"` |
| `emitLroOptions?` | `readonly` | `"all"` \| `"none"` \| `"final-state-only"` | Determines whether and how to emit x-ms-long-running-operation-options to describe resolution of asynchronous operations **Default** `"final-state-only"` |
| `examplesDirectory?` | `readonly` | `string` | - |
| `includeXTypeSpecName` | `readonly` | `"never"` \| `"inline-only"` | If the x-typespec-name extension should be included |
| `omitUnreachableTypes?` | `readonly` | `boolean` | Omit unreachable types. By default all types declared under the service namespace will be included. With this flag on only types references in an operation will be emitted. |
| `useReadOnlyStatusSchema?` | `readonly` | `boolean` | readOnly property schema behavior |
| `versionEnumStrategy?` | `readonly` | `"include"` \| `"omit"` | Decide how to deal with the version enum when `omitUnreachableTypes` is not set. **Default** `"omit"` |
