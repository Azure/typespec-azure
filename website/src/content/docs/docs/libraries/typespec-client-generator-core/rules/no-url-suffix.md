---
title: "no-url-suffix"
---

```text title="Full name"
@azure-tools/typespec-client-generator-core/no-url-suffix
```

Properties ending with `Url` should use `Uri` suffix instead to follow [.NET naming conventions](https://github.com/Azure/azure-sdk-for-net/blob/main/eng/packages/http-client-csharp-mgmt/generator/Azure.Generator.Management/src/Visitors/NameVisitor.cs). The .NET SDK generator already auto-renames `Url` → `Uri`, but this rule moves that feedback upstream to spec authoring time.

The rule checks the C#-resolved name (respecting `@clientName` overrides).

#### ❌ Incorrect

```tsp
model Foo {
  imageUrl: string;
  callbackUrl: string;
}
```

#### ✅ Correct

```tsp
model Foo {
  imageUri: string;
  callbackUri: string;
}
```

Or using `@clientName` to override just the C# name:

```tsp
model Foo {
  @clientName("imageUri", "csharp")
  imageUrl: string;
}
```
