---
jsApi: true
title: "[I] SdkHttpOperation"

---
## Extends

- `SdkServiceOperationBase`

## Properties

| Property | Type |
| ------ | ------ |
| `__raw` | `HttpOperation` |
| `bodyParam?` | [`SdkBodyParameter`](SdkBodyParameter.md) |
| `examples?` | [`SdkHttpOperationExample`](SdkHttpOperationExample.md)[] |
| `exceptions` | [`SdkHttpErrorResponse`](SdkHttpErrorResponse.md)[] |
| `kind` | `"http"` |
| `parameters` | ([`SdkPathParameter`](SdkPathParameter.md) \| [`SdkQueryParameter`](SdkQueryParameter.md) \| [`SdkHeaderParameter`](SdkHeaderParameter.md))[] |
| `path` | `string` |
| `responses` | [`SdkHttpResponse`](SdkHttpResponse.md)[] |
| `uriTemplate` | `string` |
| `verb` | `HttpVerb` |
