---
jsApi: true
title: "[F] $armLibraryNamespace"

---
```ts
function $armLibraryNamespace(context, target): void
```

Mark the target namespace as containign only ARM library types.  This is used to create libraries to share among RPs

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `context` | `DecoratorContext` | The doecorator context, automatically supplied by the compiler |
| `target` | `Namespace` | - |

## Returns

`void`
