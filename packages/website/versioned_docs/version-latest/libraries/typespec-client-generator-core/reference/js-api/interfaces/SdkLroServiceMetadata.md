---
jsApi: true
title: "[I] SdkLroServiceMetadata"

---
Long running operation metadata.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| `__raw` | `LroMetadata` | LRO metadata from TypeSpec core library |
| `finalResponse?` | [`SdkLroServiceFinalResponse`](SdkLroServiceFinalResponse.md) | Synthesized final response metadata |
| `finalStateVia` | `FinalStateValue` | Legacy `finalStateVia` value |
| `finalStep?` | [`SdkLroServiceFinalStep`](SdkLroServiceFinalStep.md) | Final step metadata |
| `pollingStep` | [`SdkLroServicePollingStep`](SdkLroServicePollingStep.md) | Polling step metadata |
