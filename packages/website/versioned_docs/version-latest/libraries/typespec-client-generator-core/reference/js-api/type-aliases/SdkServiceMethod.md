---
jsApi: true
title: "[T] SdkServiceMethod"

---
```ts
type SdkServiceMethod<TServiceOperation>: 
  | SdkBasicServiceMethod<TServiceOperation>
  | SdkPagingServiceMethod<TServiceOperation>
  | SdkLroServiceMethod<TServiceOperation>
  | SdkLroPagingServiceMethod<TServiceOperation>
| SdkLroPagingServiceMethod<TServiceOperation>;
```

## Type parameters

| Type parameter |
| :------ |
| `TServiceOperation` extends [`SdkServiceOperation`](SdkServiceOperation.md) |
