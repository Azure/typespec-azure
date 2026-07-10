---
title: "csharp-no-response-suffix"
---

```text title="Full name"
@azure-tools/typespec-client-generator-core/csharp-no-response-suffix
```

C# SDK model names ending with `Response` should use `Result` suffix instead.

The rule checks the C#-resolved name and respects `@clientName` overrides.

#### ❌ Incorrect

```tsp
model CreateWidgetResponse {
  id: string;
}
```

#### ✅ Correct

```tsp
model CreateWidgetResult {
  id: string;
}
```

Or using `@@clientName` in `client.tsp` to override just the C# name:

```tsp
// client.tsp
@@clientName(CreateWidgetResponse, "CreateWidgetResult", "csharp");
```
