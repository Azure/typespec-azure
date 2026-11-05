Using the `@format` decorator is disallowed. While in OpenAPI `format:` was used to both represent a known string format and a more precise type, in TypeSpec `@format` is only meant to represent a known pattern for a string. This means that using `@format` would result in a `string` type with some validation.

## Impact

- **Area:** API, SDK

`@format` may specify an invalid or non-standard format.

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

## Suppression

Suppression is acceptable when a valid format is used. Prefer standard types (which apply the correct wire format automatically), or `@encode` when a non-standard format such as base64url is required.

## LintDiff Equivalent

This rule provides authoring-policy coverage related to the Swagger linter rule [ValidFormats](https://github.com/Azure/azure-openapi-validator/blob/main/docs/valid-formats.md). It warns on unknown formats supplied through `@format`, but also on recognized formats such as `uuid`, because authors should prefer semantic types.

It is not a one-to-one replacement for the Swagger format allowlist: it does not validate formats produced automatically by emitters from built-in scalar types. Encoding names are checked separately by `known-encoding`.
