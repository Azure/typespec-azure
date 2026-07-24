```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/arm-no-record
```

ARM requires Resource provider teams to define types explicitly. This is to ensure good customer experience in terms of the discoverability of concrete type definitions.

## Impact

- **Area:** API, SDK

`Record<>` (additionalProperties) types are difficult to use from both the API and generated SDKs.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [AvoidAdditionalProperties](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md).

#### ❌ Incorrect

```tsp
model Address {
  address: Record<string>;
  city: string;
  state: string;
}
```

#### ✅ Correct

```tsp
model Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}
```

#### ❌ Incorrect

```tsp
model Address is Record<string>;
```

#### ✅ Correct

```tsp
model Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}
```

#### ❌ Incorrect

```tsp
model Address extends Record<string> {}
```

#### ✅ Correct

```tsp
model Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}
```

## Suppression

Suppress only when required to match an existing API; otherwise use a defined type.
