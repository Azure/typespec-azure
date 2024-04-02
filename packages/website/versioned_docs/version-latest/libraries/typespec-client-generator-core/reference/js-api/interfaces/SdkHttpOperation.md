---
jsApi: true
title: "[I] SdkHttpOperation"

---
## Extends

- `SdkServiceOperationBase`

## Properties

| Property | Type |
| :------ | :------ |
| `__raw` | `HttpOperation` |
| `bodyParam?` | [`SdkBodyParameter`](SdkBodyParameter.md) |
| `exceptions` | `Map`<`number` \| `"*"` \| `HttpStatusCodeRange`, [`SdkHttpResponse`](SdkHttpResponse.md)\> |
| `kind` | `"http"` |
| `parameters` | ([`SdkQueryParameter`](SdkQueryParameter.md) \| [`SdkPathParameter`](SdkPathParameter.md) \| [`SdkHeaderParameter`](SdkHeaderParameter.md))[] |
| `path` | `string` |
| `responses` | `Map`<`number` \| `HttpStatusCodeRange`, [`SdkHttpResponse`](SdkHttpResponse.md)\> |
| `verb` | `HttpVerb` |
