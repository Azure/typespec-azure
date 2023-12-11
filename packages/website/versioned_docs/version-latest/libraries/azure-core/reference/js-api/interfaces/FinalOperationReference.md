---
jsApi: true
title: "[I] FinalOperationReference"

---
For long-running operations, the operation link to the final result

## Extends

- [`LogicalOperationStep`](LogicalOperationStep.md)

## Properties

| Property | Type | Description | Inheritance |
| :------ | :------ | :------ | :------ |
| `kind` | `"finalOperationReference"` | - | - |
| `responseModel` | `Model` | The TypeSpec type that is returned by following a link or calling a lined operation | [`LogicalOperationStep`](LogicalOperationStep.md).`responseModel` |
| `target` | [`OperationReference`](OperationReference.md) | if another operation must be called to get the result after polling completes, contains information about how to call this operation | - |
