The rule checks the C#-resolved name (respecting `@clientName` overrides).

## Impact

- **Area:** SDK generation, **C# only**. Affects the generated property name in the C# SDK (applies to both data-plane and management-plane).
- **Not affected:** Other language SDKs, the service definition, and the wire protocol are unchanged — the serialized name is untouched, only the C# client-surface name.

## ❌ Incorrect Usage

```tsp
model Foo {
  imageUrl: string;
  callbackUrl: string;
}
```

## Diagnostic Message

For the model above, the linter reports each property whose C# name ends with `Url`:

```text
Property 'imageUrl' ends with 'Url'. Use 'Uri' suffix instead (e.g. 'imageUri'). Use @clientName("imageUri", "csharp") to rename it for C#.
```

## ✅ How to Fix

Rename the property to end with `Uri`:

```tsp
model Foo {
  imageUri: string;
  callbackUri: string;
}
```

Or use `@@clientName` in `client.tsp` to override just the C# name:

```tsp
// client.tsp
@@clientName(Foo.imageUrl, "imageUri", "csharp");
```

## Suppression

This rule is a `warning` and can be suppressed. Suppress it only when the `Url` spelling is intentional for the C# SDK:

```tsp
#suppress "@azure-tools/typespec-client-generator-core/csharp-no-url-suffix" "intentional Url naming"
model Foo {
  imageUrl: string;
}
```
