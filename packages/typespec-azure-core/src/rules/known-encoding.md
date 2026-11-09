Check that `@encode` uses a supported encoding for Azure services.

Known supported encodings:

| Target type                      | Supported encodings                   |
| -------------------------------- | ------------------------------------- |
| `utcDateTime` / `offsetDateTime` | `rfc3339`, `rfc7231`, `unixTimestamp` |
| `duration`                       | `ISO8601`, `seconds`                  |
| `bytes`                          | `base64`, `base64url`                 |

## Impact

- **Area:** API, SDK

Non-standard formats are transmitted as the raw, unencoded wire type, which hurts API and SDK usability.

## LintDiff Equivalent

This rule provides encoding-related authoring checks associated with the Swagger linter rule [ValidFormats](https://github.com/Azure/azure-openapi-validator/blob/main/docs/valid-formats.md). It checks supported `@encode` names on scalars and model properties, not all emitted OpenAPI format strings.

Encoding names and OpenAPI formats are different vocabularies: for example, `rfc3339` is an encoding name, while `date-time` is an OpenAPI format. This rule complements `no-format`; neither is a one-to-one replacement for the Swagger format allowlist.

#### ❌ Incorrect

##### Model properties

```tsp
model Foo {
  @encode("custom-rfc")
  myDateTime: utcDateTime;
}
```

##### Scalars

```tsp
@encode("custom-rfc")
scalar myDateTime extends utcDateTime;
```

#### ✅ Correct

##### Model properties

```tsp
model Foo {
  @encode("rfc3339")
  myDateTime: utcDateTime;
}
```

##### Scalars

```tsp
@encode("rfc3339")
scalar myDateTime extends utcDateTime;
```

## Suppression

Suppress only when required to match an existing API; otherwise use a standard format, encoding, or type.
