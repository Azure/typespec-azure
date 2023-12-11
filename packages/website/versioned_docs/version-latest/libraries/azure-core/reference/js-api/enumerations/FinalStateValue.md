---
jsApi: true
title: "[E] FinalStateValue"

---
Azure SDK polling information: provides data contained in the
long-running-operation-options.final-state-via field

## Enumeration Members

| Member | Value | Description |
| :------ | :------ | :------ |
| `azureAsyncOperation` | `"azure-async-operation"` | Poll the Azure-AsyncOperation header |
| `customLink` | `"custom-link"` | Poll on a header or field other than those above |
| `customOperationReference` | `"custom-operation-reference"` | Call a polling operation using the data in LroMetadata |
| `location` | `"location"` | Poll the location header |
| `noResult` | `"no-result"` | Operation should return no result |
| `operationLocation` | `"operation-location"` | poll the Operation-Location header |
| `originalUri` | `"original-uri"` | poll (GET) the same uri as the original operation |
