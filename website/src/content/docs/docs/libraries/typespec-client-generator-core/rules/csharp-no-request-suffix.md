---
title: "csharp-no-request-suffix"
---

```text title="Full name"
@azure-tools/typespec-client-generator-core/csharp-no-request-suffix
```

C# SDK model names ending with `Request` should use `Content` suffix instead.

The rule checks the C#-resolved name and respects `@clientName` overrides.

#### ❌ Incorrect

```tsp
model CreateWidgetRequest {
  name: string;
}
```

#### ✅ Correct

```tsp
model CreateWidgetContent {
  name: string;
}
```

Or using `@@clientName` in `client.tsp` to override just the C# name:

```tsp
// client.tsp
@@clientName(CreateWidgetRequest, "CreateWidgetContent", "csharp");
```
