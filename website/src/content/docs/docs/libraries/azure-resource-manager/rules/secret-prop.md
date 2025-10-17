---
title: secret-prop
---

```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/secret-prop
```

When defining the model for an ARM operation, any property that contains sensitive information (such as passwords, keys, tokens, credentials, or other secrets) must be marked with `@secret`. This ensures that secrets are properly identified and handled according to ARM security guidelines.

Arm RPC Rule: `RPC-v1-13`

#### ❌ Incorrect

```tsp
model Data {
  userPassword: string;
  apiKey: string;
}
```

#### ✅ Correct

```tsp
model Data {
  @secret
  userPassword: string;

  apiKey: apiKey;
}
```

Or create a reusable scalar marked with `@secret`:

```tsp
@secret
scalar apiKey extends string;
```
