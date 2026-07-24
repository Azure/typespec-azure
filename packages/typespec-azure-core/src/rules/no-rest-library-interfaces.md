Resource interfaces from the `TypeSpec.Rest.Resource` library are incompatible with `Azure.Core`. Use the Azure.Core resource operation patterns instead.

## Impact

- **Area:** SDK, Emitters

Describing resource APIs with raw REST-library interfaces can prevent emitters from recognizing them as resources, though that usually surfaces as other violations too.

#### ❌ Incorrect

Extending from `TypeSpec.Rest.Resource.ResourceOperations`:

```tsp
interface Widgets
  extends TypeSpec.Rest.Resource.ResourceOperations<Widget, Foundations.ErrorResponse> {}
```

#### ✅ Correct

Define a custom interface using Azure.Core operations:

```tsp
interface MyResourceOperations<TResource extends TypeSpec.Reflection.Model> {
  read is ResourceRead<TResource>;
}

interface Widgets extends MyResourceOperations<Widget> {}
```

## Suppression

Suppression is acceptable when there are no other related violations; otherwise use the standard operation templates.
