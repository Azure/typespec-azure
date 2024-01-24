---
jsApi: true
title: "[I] StatusMonitorPollingLocationInfo"

---
Collected data for status monitor polling links

## Extends

- [`PollingLocationBase`](PollingLocationBase.md)

## Properties

| Property | Type | Description | Inheritance |
| :------ | :------ | :------ | :------ |
| `finalResult?` | `Model` \| `IntrinsicType` | The type of the final result after polling completes | [`PollingLocationBase.finalResult`](PollingLocationBase.md) |
| `info` | `StatusMonitorMetadata` | The status monitor detailed data for control of polling. | - |
| `kind` | `StatusMonitor` | The kind of status monitor | [`PollingLocationBase.kind`](PollingLocationBase.md) |
| `pollingModel?` | `Model` \| `IntrinsicType` | The type of the poller | [`PollingLocationBase.pollingModel`](PollingLocationBase.md) |
| `target` | `ModelProperty` | The model property containing the polling link | [`PollingLocationBase.target`](PollingLocationBase.md) |
