---
jsApi: true
title: "[I] PollingLocationBase"

---
The abstract type for polling control information

## Extended by

- [`StatusMonitorPollingLocationInfo`](StatusMonitorPollingLocationInfo.md)

## Properties

| Property | Type | Description |
| :------ | :------ | :------ |
| `finalResult?` | `IntrinsicType` \| `Model` | The type of the final result after polling completes |
| `kind` | `StatusMonitor` | The kind of polling being done |
| `pollingModel?` | `IntrinsicType` \| `Model` | The type of the poller |
| `target` | `ModelProperty` | The model property containing the polling link |
