The `@armResourceAction` decorator should not be used together with `@segment`. If you need to rename the action, use `@action(...)` instead or omit the segment entirely.

## Impact

- **Area:** API, SDK

May indicate a resource action path that does not follow the standard segment layout.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [PathForResourceAction](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md) (partial).

## ❌ Incorrect

```tsp
@armResourceAction(MyResource)
@segment("doSomething")
@post
op doAction(...ApiVersionParameter): void;
```

## ✅ Correct

```tsp
@armResourceAction(MyResource)
@post
op doAction(...ApiVersionParameter): void;
```

## ✅ Correct (with custom action name)

```tsp
@armResourceAction(MyResource)
@action("doSomething")
@post
op doAction(...ApiVersionParameter): void;
```

## Suppression

Suppress when the resulting path is correct; otherwise use `@action` to define the final path segment with the standard resource action templates.
