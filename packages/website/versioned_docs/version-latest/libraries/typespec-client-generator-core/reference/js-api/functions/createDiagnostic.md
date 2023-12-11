---
jsApi: true
title: "[F] createDiagnostic"

---
```ts
createDiagnostic<C, M>(diag): Diagnostic
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
  \| `"discriminator-not-string"` |
| `M` extends `string` \| `number` \| `symbol` |

## Parameters

| Parameter | Type |
| :------ | :------ |
| `diag` | `DiagnosticReport`<`Object`, `C`, `M`\> |

## Returns

`Diagnostic`
