---
title: "csharp-model-suffix"
---

```text title="Full name"
@azure-tools/typespec-client-generator-core/csharp-model-suffix
```

C# SDK model names should use these recommended suffixes:

- Use `Config` instead of `Options`, except for client options.
- Use `Content` instead of `Request`.
- Use `Result` instead of `Response`.

The rule checks the C#-resolved model name and respects `@clientName` overrides.

#### ❌ Incorrect

```tsp
model SearchOptions {
  filter: string;
}

model CreateWidgetRequest {
  name: string;
}

model CreateWidgetResponse {
  id: string;
}
```

#### ✅ Correct

```tsp
model SearchConfig {
  filter: string;
}

model CreateWidgetContent {
  name: string;
}

model CreateWidgetResult {
  id: string;
}
```

Or using `@@clientName` in `client.tsp` to override just the C# name:

```tsp
// client.tsp
@@clientName(SearchOptions, "SearchConfig", "csharp");
@@clientName(CreateWidgetRequest, "CreateWidgetContent", "csharp");
@@clientName(CreateWidgetResponse, "CreateWidgetResult", "csharp");
```
