---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

In `0.46.1` we changed the type of `responses` in `SdkHttpOperation` from `Map<number | HttpRange, SdkHttpResponse>` to `SdkHttpResponse[]`, `exceptions` in `SdkHttpOperation` from `Map<number | HttpRange | "*", SdkHttpResponse>` to `SdkHttpResponse[]`,
and added a `statusCodes` property to `SdkHttpResponse`. But the `statusCodes` is defined as `number | HttpRange | "*"`, which loses the information that the responses in `responses` property could never have a `*` as its statusCodes.
This PR adds a new type `SdkHttpErrorResponse` with the `statusCodes` of `number | HttpRange | "*"`, and changes the type of `statusCodes` in `SdkHttpResponse` to `number | HttpRange` to be precise.
