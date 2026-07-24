The decorator associates the interface with its ARM resource type so ARM operations can be validated against the correct resource.

## ❌ Incorrect

```tsp
interface FooResources extends TrackedResourceOperations<FooResource, FooProperties> {}
```

## ✅ Correct

```tsp
@armResourceOperations(FooResource)
interface FooResources extends TrackedResourceOperations<FooResource, FooProperties> {}
```
