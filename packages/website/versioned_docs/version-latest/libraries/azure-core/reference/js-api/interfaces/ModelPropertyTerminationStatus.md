---
jsApi: true
title: "[I] ModelPropertyTerminationStatus"

---
Definition of a status monitor that uses a status field

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| `canceledState` | `string`[] | The status values that indicate operation cancellation, by the user or another actor |
| `failedState` | `string`[] | The status values that indicate operation failure |
| `kind` | `"model-property"` | - |
| `property` | `ModelProperty` | The property that contains the status |
| `succeededState` | `string`[] | The status values that indicate completion with success |
