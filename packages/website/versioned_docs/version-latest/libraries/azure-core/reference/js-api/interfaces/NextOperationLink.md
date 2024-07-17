---
jsApi: true
title: "[I] NextOperationLink"

---
A resource link to the next operation

## Extends

- [`LogicalOperationStep`](LogicalOperationStep.md)

## Properties

| Property | Type | Description | Overrides |
| ------ | ------ | ------ | ------ |
| `kind` | `"nextOperationLink"` | - | - |
| `responseModel` | `Model` | The TypeSpec type that is returned by following a link or calling a lined operation | [`LogicalOperationStep`](LogicalOperationStep.md).`responseModel` |
| `target` | [`OperationLink`](OperationLink.md) | information on how to get the uri to the status monitor | - |
