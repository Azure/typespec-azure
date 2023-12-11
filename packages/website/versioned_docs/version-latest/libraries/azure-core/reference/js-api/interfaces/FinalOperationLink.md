---
jsApi: true
title: "[I] FinalOperationLink"

---
For long-running operations, the resource link to the final result

## Extends

- [`LogicalOperationStep`](LogicalOperationStep.md)

## Properties

| Property | Type | Description | Inheritance |
| :------ | :------ | :------ | :------ |
| `kind` | `"finalOperationLink"` | - | - |
| `responseModel` | `Model` | The TypeSpec type that is returned by following a link or calling a lined operation | [`LogicalOperationStep`](LogicalOperationStep.md).`responseModel` |
| `target` | [`OperationLink`](OperationLink.md) | if a link must be followed to get the result after polling completes, contains information about how to get the uri from the STatusMonitor | - |
