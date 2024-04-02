---
jsApi: true
title: "[T] SdkMethod"

---
```ts
type SdkMethod<TServiceOperation>: 
  | SdkServiceMethod<TServiceOperation>
  | SdkPagingServiceMethod<TServiceOperation>
  | SdkLroServiceMethod<TServiceOperation>
  | SdkLroPagingServiceMethod<TServiceOperation>
| SdkClientAccessor<TServiceOperation>;
```

## Type parameters

| Type parameter |
| :------ |
| `TServiceOperation` extends [`SdkServiceOperation`](SdkServiceOperation.md) |
