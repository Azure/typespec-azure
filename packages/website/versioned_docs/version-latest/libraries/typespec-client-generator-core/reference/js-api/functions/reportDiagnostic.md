---
jsApi: true
title: "[F] reportDiagnostic"

---
```ts
reportDiagnostic<C, M>(program, diag): void
```

## Type parameters

| Parameter |
| :------ |
| `C` extends 
  \| `"client-name"`
  \| `"client-service"`
  \| `"unknown-client-format"`
  \| `"incorrect-client-format"`
  \| `"union-null"`
  \| `"union-unsupported"`
  \| `"use-enum-instead"`
  \| `"access"`
  \| `"invalid-usage"`
  \| `"invalid-encode"`
  \| `"discriminator-not-constant"`
  \| `"discriminator-not-string"`
  \| `"wrong-client-decorator"` |
| `M` extends `string` \| `number` \| `symbol` |

## Parameters

| Parameter | Type |
| :------ | :------ |
| `program` | `Program` |
| `diag` | `DiagnosticReport`<`Object`, `C`, `M`\> |

## Returns

`void`
