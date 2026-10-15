Validate that no two types have the same name with different casing. Having types that differ only by casing can cause issues in case-insensitive languages and is generally confusing. This applies to models, enums, and unions.

:::note
Template instances are not checked by this rule since they are not distinct type declarations.
:::

## Impact

- **Area:** SDK

Type names that differ only by casing cannot be generated into most SDK languages.

#### ❌ Incorrect

Two models that differ only by casing:

```tsp
model FailOverProperties {
  priority: int32;
}

model FailoverProperties {
  priority: int32;
}
```

Multiple types with case variations:

```tsp
model FailOverProperties {}
model FailoverProperties {}
model Failoverproperties {}
```

#### ✅ Correct

Types with meaningfully different names:

```tsp
model FailedOver {
  status: string;
}

model FailOver {
  priority: int32;
}
```

## Suppression

Suppress only if the API somehow allows it, and then rename the types with client SDK decorators. Otherwise make type names unique when compared case-insensitively.
