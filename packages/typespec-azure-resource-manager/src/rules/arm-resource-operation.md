Validate that all ARM Resource operations are defined inside an interface, include an `api-version` parameter, and use the correct decorator for the HTTP verb.

## Impact

- **Area:** API, SDK, Emitters

Missing the resource decorators can leave operations unassociated with their resource - breaking the C# SDK and preventing resource-based reasoning, linting, and generation of resource-centric content (service generation, tests, portal).

## ❌ Incorrect

Operations must be inside an interface:

```tsp
// Operation defined outside of an interface
@armResourceRead(FooResource)
@get
op getFoos(...ApiVersionParameter): FooResource;
```

Operations must use the correct ARM resource decorator for the HTTP verb:

```tsp
@armResourceOperations
interface FooResources {
  // Missing @armResourceCreateOrUpdate decorator
  @put createOrUpdate(
    ...ResourceInstanceParameters<FooResource>,
    @bodyRoot resource: FooResource,
  ): ArmResponse<FooResource>;
}
```

## ✅ Correct

```tsp
@armResourceOperations
interface FooResources {
  get is ArmResourceRead<FooResource>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<FooResource>;
}
```

## Suppression

Requires C# SDK sign-off and careful review of any other violations. Use the standard resource types, or decorate with `@customAzureResource` when that is not possible, and use the operation templates.
