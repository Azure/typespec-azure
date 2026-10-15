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

This rule corresponds to the LintDiff rule [ValidFormats](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r2003).

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

## Suppression

Suppress only when required to match an existing API; otherwise use a standard format, encoding, or type.
