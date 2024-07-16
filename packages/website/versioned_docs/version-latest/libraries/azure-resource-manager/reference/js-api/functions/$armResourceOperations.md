---
jsApi: true
title: "[F] $armResourceOperations"

---
```ts
function $armResourceOperations(context, interfaceType): void
```

This decorator is used to identify interfaces containing resource operations.
When applied, it marks the interface with the `@autoRoute` decorator so that
all of its contained operations will have their routes generated
automatically.

It also adds a `@tag` decorator bearing the name of the interface so that all
of the operations will be grouped based on the interface name in generated
clients.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `context` | `DecoratorContext` |
| `interfaceType` | `Interface` |

## Returns

`void`
