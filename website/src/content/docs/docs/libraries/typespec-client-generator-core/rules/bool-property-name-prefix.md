---
title: bool-property-name-prefix
---

```text title="Full name"
@azure-tools/typespec-client-generator-core/bool-property-name-prefix
```

Boolean property and parameter names should start with a verb such as
`Is`, `Has`, `Can`, `Should`, `Are`, `Was`, `Will`, `Does`, or `Do`,
followed by an uppercase letter. This rule encodes the
[Azure SDK for .NET management plane naming convention](https://github.com/Azure/azure-sdk-for-net/blob/main/doc/dev/Mgmt-Naming-Conventions.md)
and is part of the `best-practices:csharp` ruleset.

The rule walks model properties and operation parameters whose effective
type resolves to `boolean` (including custom scalars that extend
`boolean`), and inspects the C#-scoped name (the value of
`@clientName(..., "csharp")` if provided, otherwise the TypeSpec name).

To fix violations, either rename the property/parameter in TypeSpec when
the convention applies cross-language, or use
`@clientName("Is<PascalName>", "csharp")` to provide a C#-only override
while keeping the original TypeSpec name.

#### ❌ Incorrect

```tsp
model Widget {
  tracked: boolean;
  exclude: boolean;
}

op getWidget(restore: boolean): Widget;
```

#### ✅ Correct (rename in TypeSpec)

```tsp
model Widget {
  isTracked: boolean;
  isExcluded: boolean;
}

op getWidget(isRestore: boolean): Widget;
```

#### ✅ Correct (rename for C# only)

```tsp
model Widget {
  @clientName("IsTracked", "csharp")
  tracked: boolean;

  @clientName("IsExcluded", "csharp")
  exclude: boolean;
}
```
