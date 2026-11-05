POST action suffixes default to the operation name. Add an explicit suffix with
`@action("suffix")` so that reusing or renaming an operation does not silently change the
action suffix.

#### ❌ Incorrect

```tsp
@autoRoute
interface SomeInterface {
  @post
  @action
  myOldAction(): void;
}

op myNewAction is SomeInterface.myOldAction;
```

#### ✅ Correct

```tsp
@autoRoute
interface SomeInterface {
  @post
  @action("myOldAction")
  myOldAction(): void;
}

@route("/aliases")
interface AliasInterface {
  @action("myOldAction")
  myNewAction is SomeInterface.myOldAction;
}
```

## Impact

- **Area:** API

Changing an action suffix changes the API route and can break clients that call the existing
action. An explicit suffix keeps the route stable when an operation is reused or renamed.

## Suppression

Avoid suppressing this warning when an operation is reused; specify the intended suffix with
`@action("suffix")` instead. Suppress only when intentionally changing the public action suffix:

```tsp
#suppress "@azure-tools/typespec-azure-core/use-explicit-action" "This API intentionally changes the action suffix."
op myNewAction is SomeInterface.myOldAction;
```
