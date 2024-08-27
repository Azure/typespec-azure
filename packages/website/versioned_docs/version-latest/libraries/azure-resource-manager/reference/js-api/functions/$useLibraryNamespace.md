---
jsApi: true
title: "[F] $useLibraryNamespace"

---
```ts
function $useLibraryNamespace(
   context, 
   target, ...
   namespaces): void
```

Specify which ARM library namespaces this arm provider uses

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `context` | `DecoratorContext` | Standard DecoratorContext object |
| `target` | `Namespace` | - |
| ...`namespaces` | `Namespace`[] | The library namespaces that will be used in this namespace |

## Returns

`void`
