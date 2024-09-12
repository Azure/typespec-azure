---
jsApi: true
title: "[F] createDiagnostic"

---
```ts
function createDiagnostic<C, M>(diag): Diagnostic
```

## Type Parameters

| Type Parameter |
| ------ |
| `C` *extends* \| `"client-name"` \| `"client-service"` \| `"unknown-client-format"` \| `"incorrect-client-format"` \| `"union-null"` \| `"union-unsupported"` \| `"use-enum-instead"` \| `"access"` \| `"invalid-usage"` \| `"invalid-encode"` \| `"conflicting-multipart-model-usage"` \| `"discriminator-not-constant"` \| `"discriminator-not-string"` \| `"wrong-client-decorator"` \| `"encoding-multipart-bytes"` \| `"unsupported-kind"` \| `"multiple-services"` \| `"server-param-not-path"` \| `"unexpected-http-param-type"` \| `"multiple-response-types"` \| `"no-corresponding-method-param"` \| `"unsupported-protocol"` \| `"no-emitter-name"` \| `"unsupported-generic-decorator-arg-type"` \| `"empty-client-name"` \| `"override-method-parameters-mismatch"` \| `"duplicate-client-name"` \| `"example-loading"` \| `"duplicate-example-file"` \| `"example-value-no-mapping"` \| `"flatten-polymorphism"` \| `"conflict-access-override"` \| `"conflict-usage-override"` |
| `M` *extends* `string` \| `number` \| `symbol` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `diag` | `DiagnosticReport`<`object`, `C`, `M`\> |

## Returns

`Diagnostic`
