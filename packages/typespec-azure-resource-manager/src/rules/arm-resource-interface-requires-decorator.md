The decorator associates the interface with its ARM resource type so ARM operations can be validated against the correct resource.

## Impact

- **Area:** API

Without `@armResourceOperations`, the interface is not associated with its ARM resource type, so ARM operation validation cannot be applied and the generated operations may be incorrect.

## ❌ Incorrect

```tsp
interface FooResources extends TrackedResourceOperations<FooResource, FooProperties> {}
```

## ✅ Correct

```tsp
@armResourceOperations(FooResource)
interface FooResources extends TrackedResourceOperations<FooResource, FooProperties> {}
```

## Suppression

Do not suppress. Add the `@armResourceOperations` decorator to associate the interface with its resource.
