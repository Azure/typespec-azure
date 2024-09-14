---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

1. The type of `responses` and `exceptions` in `SdkHttpOperation` changed from `Map` to array.
2. The type of `responses` in `SdkHttpOperationExample` changed from `Map` to array.
3. `SdkHttpResponse` adds a new property `statusCodes` to store its corresponding status code or status code range.
