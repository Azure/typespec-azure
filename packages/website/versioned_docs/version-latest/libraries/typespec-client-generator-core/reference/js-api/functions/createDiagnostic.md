---
jsApi: true
title: "[F] createDiagnostic"

---
```ts
createDiagnostic<C, M>(diag): Diagnostic
```

## Type parameters

| Type parameter |
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
  \| `"conflicting-multipart-model-usage"`
  \| `"discriminator-not-constant"`
  \| `"discriminator-not-string"`
  \| `"wrong-client-decorator"`
  \| `"encoding-multipart-bytes"`
  \| `"unsupported-kind"`
  \| `"multiple-services"`
  \| `"server-param-not-path"` |
| `M` extends `string` \| `number` \| `symbol` |

## Parameters

| Parameter | Type |
| :------ | :------ |
| `diag` | `DiagnosticReport`<`Object`, `C`, `M`\> |

## Returns

`Diagnostic`
