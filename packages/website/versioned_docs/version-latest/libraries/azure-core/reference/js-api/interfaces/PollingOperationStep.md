---
jsApi: true
title: "[I] PollingOperationStep"

---
Indicates that an operation step involves polling, and includes details on
how to end polling

## Extends

- [`LogicalOperationStep`](LogicalOperationStep.md)

## Properties

| Property | Type | Description | Inheritance |
| :------ | :------ | :------ | :------ |
| `errorProperty?` | `ModelProperty` | Property of the status monitor that contains operation errors in case of failure (if any) | - |
| `kind` | `"pollingOperationStep"` | - | - |
| `responseModel` | `Model` | The TypeSpec type that is returned by following a link or calling a lined operation | [`LogicalOperationStep.responseModel`](LogicalOperationStep.md) |
| `resultProperty?` | `ModelProperty` | Property of the status monitor that contains the logical operation result (if any) | - |
| `terminationStatus` | [`TerminationStatus`](../type-aliases/TerminationStatus.md) | Information on how to determine when the operation reaches a terminal state (most often, this is the terminal values that may be returned in the status field) | - |
