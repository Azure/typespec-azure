---
jsApi: true
title: "[I] NextOperationReference"

---
An operation link to the next operation

## Extends

- [`LogicalOperationStep`](LogicalOperationStep.md)

## Properties

| Property | Type | Description | Inheritance |
| :------ | :------ | :------ | :------ |
| `kind` | `"nextOperationReference"` | - | - |
| `responseModel` | `Model` | The TypeSpec type that is returned by following a link or calling a lined operation | [`LogicalOperationStep.responseModel`](LogicalOperationStep.md) |
| `target` | [`OperationReference`](OperationReference.md) | Information on how to call the STatusMonitor operation | - |
