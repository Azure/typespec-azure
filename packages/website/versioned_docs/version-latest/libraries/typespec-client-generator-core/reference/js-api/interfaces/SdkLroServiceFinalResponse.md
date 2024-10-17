---
jsApi: true
title: "[I] SdkLroServiceFinalResponse"

---
Synthesized long running operation response metadata.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| `envelopeResult` | [`SdkModelType`](SdkModelType.md) | Intact response type |
| `result` | [`SdkModelType`](SdkModelType.md) | Meaningful result type |
| `resultPath?` | `string` | Property path to fetch {result} from {envelopeResult}. Note that this property is available only in some LRO patterns. |
