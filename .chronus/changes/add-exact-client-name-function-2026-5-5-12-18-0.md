---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Added `exact()` function for use with `@clientName` to preserve client names without language-specific casing transformations. When a name is marked with `exact()`, emitters should use it as-is.

```typespec
// Python will use "hello_world" exactly, without converting to PascalCase or other conventions
@clientName(exact("hello_world"), "python")
model MyModel {}
```

Also added `isExactName` boolean field to SDK type interfaces (`SdkModelType`, `SdkEnumType`, `SdkUnionType`, `SdkModelPropertyTypeBase`, etc.) so emitters can check whether to skip casing transformations.
