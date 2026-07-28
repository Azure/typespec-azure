---
changeKind: feature
packages:
  - "@azure-tools/typespec-go"
---

Support paging with a relative nextLink. Pagers now resolve a next link that's relative to the client endpoint before fetching the next page; absolute next links are unchanged.
