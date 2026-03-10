---
title: "no-explicit-routes-resource-ops"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-explicit-routes-resource-ops
```

The `@route` decorator should not be used on standard resource operation signatures. Standard resource operations already have well-defined routes. If you need to add a route prefix, use `@route` on an interface or namespace instead.

#### ❌ Incorrect

Using `@route` directly on resource operations:

```tsp
@resource("widgets")
model Widget {
  @key name: string;
}

@route("/api/widgets/{name}")
op readWidget is Azure.Core.StandardResourceOperations.ResourceRead<Widget>;

@route("/api/widgets")
op listWidgets is Azure.Core.StandardResourceOperations.ResourceList<Widget>;
```

#### ✅ Correct

Let standard resource operations define their own routes:

```tsp
@resource("widgets")
model Widget {
  @key name: string;
}

// route: /widgets/{name}
op readWidget is Azure.Core.StandardResourceOperations.ResourceRead<Widget>;
// route: /widgets
op listWidgets is Azure.Core.StandardResourceOperations.ResourceList<Widget>;
```
