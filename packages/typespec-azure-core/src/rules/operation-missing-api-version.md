Ensure all operations have an `apiVersion` parameter.

:::caution
Seeing this error is also a sign that you are not using the Azure Standard templates. First double check why you cannot use them.
:::

## Impact

- **Area:** API, SDK

An operation without an api-version parameter cannot evolve across api-versions.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [ApiVersionParameterRequired](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md).

#### ❌ Incorrect

```tsp
op createPet(pet: Pet): void;
```

### ✅ Correct

```tsp
op createPet(pet: Pet, ...Azure.Core.Foundations.ApiVersionParameter): void;
```

## Suppression

Do not suppress unless it is a false positive. Use the standard operation templates.
