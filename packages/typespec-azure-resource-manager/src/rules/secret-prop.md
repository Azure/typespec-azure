Marking these fields lets ARM and SDK tooling identify sensitive values and handle them according to security guidelines.

:::note
ARM RPC rule: [`RPC-v1-13`](https://armwiki.azurewebsites.net/api_contracts/guidelines/rpc.html)
:::

## Impact

- **Area:** SDK, API

Returning a secret in a response violates the RPC contract unless the property is genuinely not a secret.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [XMSSecretInResponse](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md).

## ❌ Incorrect

```tsp
model Data {
  userPassword: string;
  apiKey: string;
}
```

## ✅ Correct

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

## Suppression

Suppress only if the property is not actually a secret; otherwise mark it as a `password` type or with the `@secret` decorator.
