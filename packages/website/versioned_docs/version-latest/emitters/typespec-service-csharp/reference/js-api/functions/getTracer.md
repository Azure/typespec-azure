---
jsApi: true
title: "[F] getTracer"

---
```ts
function getTracer(program): Tracer
```

Returns a tracer scopped to the current library.
All trace area logged via this tracer will be prefixed with the library name.

## Parameters

| Parameter | Type |
| :------ | :------ |
| `program` | `Program` |

## Returns

`Tracer`
