---
jsApi: true
title: "[I] OperationReference"

---
Custom polling
Represents a reference to an operation, including a map from the
original operation to the parameters of the linked operation

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| `kind` | `"reference"` | - |
| `operation` | `Operation` | The referenced operation |
| `parameterMap?` | `Map`<`string`, [`ParameterSource`](ParameterSource.md)\> | information on how to construct the operation parameters from the original request and response |
| `parameters?` | `Map`<`string`, `PropertyMap`\> | - |
