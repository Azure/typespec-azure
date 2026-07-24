```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/no-empty-model
```

ARM Properties with type:object that don't reference a model definition are not allowed. ARM doesn't allow generic type definitions as this leads to bad customer experience.

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
