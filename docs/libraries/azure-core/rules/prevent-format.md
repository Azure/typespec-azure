---
title: "prevent-format"
---

```text title="Full name"
@azure-tools/typespec-azure-core/prevent-format
```

Using the `@format` decorator is disallowed. While in OpenAPI `format:` was used to both represent a known string format and a more precise type, in TypeSpec `@format` is only meant to represent a known pattern for a string. This means that using `@format` would result in a `string` type with some validation.

## Mapping of format to types

| Format   | Type                               |
| -------- | ---------------------------------- |
| `int32`  | `int32`                            |
| `uri`    | `url`                              |
| `url`    | `url`                              |
| `uuid`   | `Azure.Core.uuid`                  |
| `eTag`   | `Azure.Core.eTag`                  |
| `arm-id` | `Azure.Core.armResourceIdentifier` |
| `ipv4`   | `Azure.Core.ipV4Address`           |
| `ipv6`   | `Azure.Core.ipV6Address`           |
| `ipv6`   | `Azure.Core.azureLocation`         |

## Examples

#### ❌ Incorrect

```tsp
model Pet {
  @format("uuid")
  id: string;
}
```

#### ✅ Correct

```tsp
model Pet {
  id: Azure.Core.uuid;
}
```
