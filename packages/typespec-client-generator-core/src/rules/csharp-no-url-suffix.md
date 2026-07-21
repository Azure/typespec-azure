Properties ending with `Url` should use `Uri` suffix instead to follow .NET SDK naming conventions.

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

Or using `@@clientName` in `client.tsp` to override just the C# name:

```tsp
// client.tsp
@@clientName(Foo.imageUrl, "imageUri", "csharp");
```
