---
title: model-name-resource-suffix
---

```text title="Full name"
@azure-tools/typespec-client-generator-core/model-name-resource-suffix
```

Model names should not end with `Resource`. The
[Azure SDK for .NET management plane naming convention](https://github.com/Azure/azure-sdk-for-net/blob/main/doc/dev/Mgmt-Naming-Conventions.md)
recommends dropping the `Resource` suffix when the remaining noun is
descriptive enough, or replacing it with `Data` or `Info`. This rule is
part of the `best-practices:csharp` ruleset.

The rule inspects the C#-scoped name of each model (the value of
`@clientName(..., "csharp")` if provided, otherwise the TypeSpec name).
Well-known base types (`TrackedResource`, `ProxyResource`,
`ExtensionResource`, `GenericResource`) are excluded.

To fix violations, either rename the model in TypeSpec when the
convention applies cross-language, or use `@clientName` to provide a
C#-only override while keeping the original TypeSpec name.

#### ❌ Incorrect

```tsp
model EvidenceResource {
  value: string;
}

model ReportResource {
  name: string;
}
```

#### ✅ Correct (drop suffix)

```tsp
model Evidence {
  value: string;
}

model Report {
  name: string;
}
```

#### ✅ Correct (rename for C# only)

```tsp
@clientName("Evidence", "csharp")
model EvidenceResource {
  value: string;
}

@clientName("ReportData", "csharp")
model ReportResource {
  name: string;
}
```
