---
title: "known-encoding"
---

```text title="Full name"
@azure-tools/typespec-azure-core/known-encoding
```

Check that `@encode` uses a supported encoding for Azure services.

Known supported encodings:

| Target type                      | Supported encodings                   |
| -------------------------------- | ------------------------------------- |
| `utcDateTime` / `offsetDateTime` | `rfc3339`, `rfc7231`, `unixTimestamp` |
| `duration`                       | `ISO8601`, `seconds`                  |
| `bytes`                          | `base64`, `base64url`                 |

#### ❌ Incorrect

Unknown encoding on a model property:

```tsp
model Foo {
  @encode("custom-rfc")
  myDateTime: utcDateTime;
}
```

Unknown encoding on a scalar:

```tsp
@encode("custom-rfc")
scalar myDateTime extends utcDateTime;
```

#### ✅ Correct

Known encoding on a model property:

```tsp
model Foo {
  @encode("rfc3339")
  myDateTime: utcDateTime;
}
```

Known encoding on a scalar:

```tsp
@encode("rfc3339")
scalar myDateTime extends utcDateTime;
```
