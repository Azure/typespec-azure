---
jsApi: true
title: "[I] PollingSuccessNoResult"

---
For long-running operations using a status monitor, indicates that
the operation has no logical final result when polling completes.

## Extends

- [`LogicalOperationStep`](LogicalOperationStep.md)

## Properties

| Property | Type | Description | Inheritance |
| :------ | :------ | :------ | :------ |
| `kind` | `"pollingSuccessNoResult"` | - | - |
| `responseModel` | `Model` | The TypeSpec type that is returned by following a link or calling a lined operation | [`LogicalOperationStep`](LogicalOperationStep.md).`responseModel` |
| `target` | `null` | There is no target | - |
