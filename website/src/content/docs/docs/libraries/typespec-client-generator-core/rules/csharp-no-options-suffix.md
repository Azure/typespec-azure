---
title: "csharp-no-options-suffix"
---

```text title="Full name"
@azure-tools/typespec-client-generator-core/csharp-no-options-suffix
```

C# SDK model names ending with `Options` should use `Config` suffix instead, except client options.

The rule checks the C#-resolved name and respects `@clientName` overrides.

#### ❌ Incorrect

```tsp
model SearchOptions {
  filter: string;
}
```

#### ✅ Correct

```tsp
model SearchConfig {
  filter: string;
}
```

Or using `@@clientName` in `client.tsp` to override just the C# name:

```tsp
// client.tsp
@@clientName(SearchOptions, "SearchConfig", "csharp");
```
