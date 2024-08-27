---
jsApi: true
title: "[T] SdkServiceMethod"

---
```ts
type SdkServiceMethod<TServiceOperation>: SdkBasicServiceMethod<TServiceOperation> | SdkPagingServiceMethod<TServiceOperation> | SdkLroServiceMethod<TServiceOperation> | SdkLroPagingServiceMethod<TServiceOperation>;
```

## Type Parameters

| Type Parameter |
| ------ |
| `TServiceOperation` *extends* [`SdkServiceOperation`](SdkServiceOperation.md) |
