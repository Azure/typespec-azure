---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
---

Add the `no-request-body` lint rule to report GET and DELETE operations with request bodies across data-plane and Azure Resource Manager APIs.

```tsp
@get
op read(@body filter: { name: string }): string; // warning: GET request body

@delete
op remove(@body options: { force: boolean }): void; // warning: DELETE request body
```
