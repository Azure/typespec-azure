Validate names follow the [TypeSpec Style guide](https://typespec.io/docs/handbook/style-guide)

## Impact

- **Area:** API, SDK

On properties this produces non-standard wire casing that hurts API usability; on other declarations emitters substitute the correct casing for their language.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [DefinitionsPropertiesNamesCamelCase](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r3016) (partial - covers the serious property-casing violation).

#### ❌ Incorrect

```tsp
model pet {}
model pet_food {}
```

```tsp
model Pet {
  Name: string;
}
```

```tsp
op CreatePet(): void;
```

```tsp
interface petStores {}
```

#### ✅ Correct

```tsp
model Pet {}
model PetFood {}
```

```tsp
model Pet {
  name: string;
}
```

```tsp
op createPet(): void;
```

```tsp
interface PetStores {}
```

## Suppression

Suppression is acceptable on non-property declarations, where the effect is cosmetic. Avoid suppressing on properties - use standard casing (PascalCase for namespaces, interfaces, models, unions, enums; camelCase for properties, parameters, operations, scalars).
