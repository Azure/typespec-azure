---
jsApi: true
title: "[I] StatusMonitorPollingLocationInfo"

---
Collected data for status monitor polling links

## Extends

- [`PollingLocationBase`](PollingLocationBase.md)

## Properties

| Property | Type | Description | Overrides | Inherited from |
| ------ | ------ | ------ | ------ | ------ |
| `finalResult?` | `IntrinsicType` \| `Model` | The type of the final result after polling completes | - | [`PollingLocationBase`](PollingLocationBase.md).`finalResult` |
| `info` | `StatusMonitorMetadata` | The status monitor detailed data for control of polling. | - | - |
| `kind` | `pollingOptionsKind` | The kind of status monitor | [`PollingLocationBase`](PollingLocationBase.md).`kind` | - |
| `pollingModel?` | `IntrinsicType` \| `Model` | The type of the poller | - | [`PollingLocationBase`](PollingLocationBase.md).`pollingModel` |
| `target` | `ModelProperty` | The model property containing the polling link | - | [`PollingLocationBase`](PollingLocationBase.md).`target` |
