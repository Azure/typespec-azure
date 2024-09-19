---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

1. The type of `responses` and `exceptions` in `SdkHttpOperation` changed from `Map<number | HttpStatusCodeRange | "*", SdkHttpResponse>` to `SdkHttpResponse[]`.
2. The type of `responses` in `SdkHttpOperationExample` changed from `Map<number, SdkHttpResponseExampleValue>` to `SdkHttpResponseExampleValue[]`.
3. `SdkHttpResponse` adds a new property `statusCodes` to store its corresponding status code or status code range.

Migration hints:
The type changed from map to array, and the key of the map is moved as a new property of the value type. For example, for code like this:
```
for (const [statusCodes, response] of operation.responses)
```
you could do the same in this way:
```
for (const response of operation.responses)
{
  const statusCodes = response.statusCodes;
}
```
