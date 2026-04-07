---
title: arm-resource-action-no-segment
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-action-no-segment
```

The `@armResourceAction` decorator should not be used together with `@segment`. If you need to rename the action, use `@action(...)` instead or omit the segment entirely.

#### ❌ Incorrect

```tsp
@armResourceAction(MyResource)
@segment("doSomething")
@post
op doAction(...ApiVersionParameter): void;
```

#### ✅ Correct

```tsp
@armResourceAction(MyResource)
@post
op doAction(...ApiVersionParameter): void;
```

#### ✅ Correct (with custom action name)

```tsp
@armResourceAction(MyResource)
@action("doSomething")
@post
op doAction(...ApiVersionParameter): void;
```
