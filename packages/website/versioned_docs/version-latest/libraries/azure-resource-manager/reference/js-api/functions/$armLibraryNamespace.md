---
jsApi: true
title: "[F] $armLibraryNamespace"

---
```ts
function $armLibraryNamespace(context, entity): void
```

Mark the target namespace as containign only ARM library types.  This is used to create libraries to share among RPs

## Parameters

| Parameter | Type | Description |
| :------ | :------ | :------ |
| `context` | `DecoratorContext` | The doecorator context, automatically supplied by the compiler |
| `entity` | `Namespace` | The decorated namespace |

## Returns

`void`
