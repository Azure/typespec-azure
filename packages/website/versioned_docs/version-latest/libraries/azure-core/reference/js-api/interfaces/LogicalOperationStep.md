---
jsApi: true
title: "[I] LogicalOperationStep"

---
Custom polling
A step in a logical operation that involves multiple calls

## Extended by

- [`PollingOperationStep`](PollingOperationStep.md)
- [`NextOperationLink`](NextOperationLink.md)
- [`NextOperationReference`](NextOperationReference.md)
- [`FinalOperationLink`](FinalOperationLink.md)
- [`FinalOperationReference`](FinalOperationReference.md)
- [`PollingSuccessProperty`](PollingSuccessProperty.md)
- [`NoPollingSuccessProperty`](NoPollingSuccessProperty.md)
- [`PollingSuccessNoResult`](PollingSuccessNoResult.md)

## Properties

| Property | Type | Description |
| :------ | :------ | :------ |
| `responseModel` | `IntrinsicType` \| `Model` | The TypeSpec type that is returned by following a link or calling a lined operation |
