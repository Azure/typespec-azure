---
jsApi: true
title: "[I] PollingSuccessProperty"

---
For long-running operations using a status monitor, describes the
property of the StatusMonitor that contains the success response

## Extends

- [`LogicalOperationStep`](LogicalOperationStep.md)

## Properties

| Property | Type | Description | Overrides |
| :------ | :------ | :------ | :------ |
| `kind` | `"pollingSuccessProperty"` | - | - |
| `responseModel` | `Model` | The TypeSpec type that is returned by following a link or calling a lined operation | [`LogicalOperationStep`](LogicalOperationStep.md).`responseModel` |
| `sourceProperty` | `undefined` \| `ModelProperty` | The property in the response that contained a url to the status monitor | - |
| `target` | `ModelProperty` | The property containing the results of success | - |
