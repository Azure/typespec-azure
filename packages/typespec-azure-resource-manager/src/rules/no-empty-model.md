Define a named model with explicit properties instead of a generic object shape so clients and OpenAPI consumers see a concrete schema.

## Impact

- **Area:** API, SDK

A model that accepts any schema is difficult to use from both the API and generated SDKs.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [MissingTypeObject](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r4037).

## ❌ Incorrect

```tsp
model Information {
  address: {};
}
```

## ❌ Incorrect

```tsp
model Empty {}
```

## ✅ Correct

```tsp
model Information {
  address: Address;
}

model Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}
```

## ✅ Correct

```tsp
model Information {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}
```

## Suppression

Suppress only when required to match an existing API; otherwise use a defined type.
