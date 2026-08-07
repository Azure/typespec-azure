---
changeKind: feature
packages:
  - "@azure-tools/typespec-go"
---

Support paging with a relative nextLink. Pagers now pass the client endpoint to `runtime.FetcherForNextLink` so a next link relative to the endpoint can be resolved; absolute next links are unchanged.
