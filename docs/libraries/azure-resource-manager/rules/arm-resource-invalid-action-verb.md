---
title: arm-resource-invalid-action-verb
---

```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-action-verb
```

For ARM http operations, the action verb must be `@post`. Any other action verb is flagged as incorrect.

#### ❌ Incorrect

```tsp
@get op getAction is ArmProviderActionAsync<
  {
    name: string;
  },
  ArmCombinedLroHeaders,
  SubscriptionActionScope
>;
```

#### ✅ Correct

```tsp
op postAction is ArmProviderActionAsync<
  {
    name: string;
  },
  ArmCombinedLroHeaders,
  SubscriptionActionScope
>;
```
