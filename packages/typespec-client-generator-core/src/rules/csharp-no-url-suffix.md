Properties ending with `Url` should use `Uri` suffix instead to follow .NET SDK naming conventions.

The rule checks the C#-resolved name (respecting `@clientName` overrides).

## Impact

- **Area:** SDK generation, **C# only**. Affects the generated property name in the C# SDK (applies to both data-plane and management-plane).
- **Not affected:** Other language SDKs, the service definition, and the wire protocol are unchanged — the serialized name is untouched, only the C# client-surface name.

## Severity

`warning` — suppressible. This is a .NET naming-convention issue, not a correctness error: the C# SDK still generates, but the property name will not match .NET's preferred `Uri` spelling. Recommended to fix so the C# SDK reads idiomatically.

## Diagnostic message

```text
Property 'imageUrl' ends with 'Url'. Use 'Uri' suffix instead (e.g. 'imageUri'). Use @clientName("imageUri", "csharp") to rename it for C#.
```

**What it means:** A property's C#-resolved name ends with `Url`, which the .NET guidelines spell as `Uri`.

**Why it matters:** .NET SDKs consistently use the `Uri` suffix. A `Url`-suffixed property makes the generated C# SDK inconsistent with .NET conventions and other Azure C# SDKs.

**Recommended fix:** Rename the property to end with `Uri`, or keep the TypeSpec name and rename it for C# only with `@clientName("<name>Uri", "csharp")`.

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

Or using `@@clientName` in `client.tsp` to override just the C# name:

```tsp
// client.tsp
@@clientName(Foo.imageUrl, "imageUri", "csharp");
```

## Suppression

Suppress this rule only when the `Url` spelling is intentional for the C# SDK:

```tsp
#suppress "@azure-tools/typespec-client-generator-core/csharp-no-url-suffix" "intentional Url naming"
model Foo {
  imageUrl: string;
}
```
