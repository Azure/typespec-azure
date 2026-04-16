---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add `serializationOptions` to `SdkBodyParameter` and `SdkHttpResponse`/`SdkHttpErrorResponse` so emitters can determine the serialization format for request/response bodies regardless of whether the body type is a model or a basic type.
