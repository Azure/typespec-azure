```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/missing-x-ms-identifiers
```

Array of models must explicity define which keys are used as identifiers using the `@identifiers` decorator.

## Impact

- **Area:** API

An old-pattern warning with no real runtime impact.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [XmsIdentifierValidation](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r4041) (warning).

#### ❌ Incorrect

```tsp
model Address {
  city: string;
  street: string;
}

model ResourceProperties {
  array: Address[];
}
```

#### ✅ Correct

```tsp
model ResourceProperties {
  @identifiers(#["city", "street"])
  array: Address[];
}
```

## Suppression

Suppress at will.
