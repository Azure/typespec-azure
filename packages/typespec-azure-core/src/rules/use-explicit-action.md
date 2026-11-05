This rule warns only when reusing a POST action changes its action segment and its resolved HTTP path. POST action suffixes default to the operation name, so reusing an action under a different name can silently change the route. Specify the intended suffix with `@action("suffix")` to preserve it.

An action that is not reused does not need an explicit suffix. Reuse that preserves the action segment is also allowed, including reuse under a different route prefix. Operations whose explicit routes do not use the action segment are not flagged.

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
  @action
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

Changing an action suffix changes the API route and can break clients that call the existing action. An explicit suffix keeps the action segment stable when an operation is reused under a different name.

## Suppression

Avoid suppressing this warning when an operation is reused; specify the intended suffix with `@action("suffix")` instead. Suppress only when intentionally changing the public action suffix:

```tsp
#suppress "@azure-tools/typespec-azure-core/use-explicit-action" "This API intentionally changes the action suffix."
op myNewAction is SomeInterface.myOldAction;
```
