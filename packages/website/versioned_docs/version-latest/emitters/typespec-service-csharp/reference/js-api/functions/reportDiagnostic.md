---
jsApi: true
title: "[F] reportDiagnostic"

---
```ts
function reportDiagnostic<C, M>(program, diag): void
```

## Type parameters

| Type parameter |
| :------ |
| `C` *extends* `"invalid-identifier"` \| `"missing-type-parent"` \| `"no-numeric"` \| `"unrecognized-scalar"` |
| `M` *extends* `string` \| `number` \| `symbol` |

## Parameters

| Parameter | Type |
| :------ | :------ |
| `program` | `Program` |
| `diag` | `DiagnosticReport`<`object`, `C`, `M`\> |

## Returns

`void`
