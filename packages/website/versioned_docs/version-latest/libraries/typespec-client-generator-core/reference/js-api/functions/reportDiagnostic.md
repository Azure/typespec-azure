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
| `C` *extends* 
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
  \| `"server-param-not-path"`
  \| `"unexpected-http-param-type"`
  \| `"multiple-response-types"`
  \| `"no-corresponding-method-param"`
  \| `"unsupported-protocol"`
  \| `"no-emitter-name"` |
| `M` *extends* `string` \| `number` \| `symbol` |

## Parameters

| Parameter | Type |
| :------ | :------ |
| `program` | `Program` |
| `diag` | `DiagnosticReport`<`object`, `C`, `M`\> |

## Returns

`void`
