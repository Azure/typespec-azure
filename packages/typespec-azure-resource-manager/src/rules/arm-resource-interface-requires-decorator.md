Each resource interface must have an `@armResourceOperations` decorator to associate the interface with its ARM resource type.

#### ❌ Incorrect

```tsp
interface FooResources extends TrackedResourceOperations<FooResource, FooProperties> {}
```

#### ✅ Correct

```tsp
@armResourceOperations(FooResource)
interface FooResources extends TrackedResourceOperations<FooResource, FooProperties> {}
```
