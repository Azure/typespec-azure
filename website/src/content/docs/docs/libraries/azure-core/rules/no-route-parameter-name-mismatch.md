---
title: "no-route-parameter-name-mismatch"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-route-parameter-name-mismatch
```

Operations that share the same route path (ignoring parameter names) should use consistent path parameter names. When two operations resolve to the same path structure but use different names for corresponding path parameters, it typically indicates a misconfiguration, such as mixing legacy templates with standard templates.

:::note
Operations that use `allowReserved` path parameters (e.g., `scope` or `resourceUri` parameters used with extension resources) are excluded from this check, as they are intentionally set up with different parameter names.
:::

#### ❌ Incorrect

Two operations with the same path structure but different parameter names:

```tsp
@route("/subscriptions/{subscriptionId}/providers/Microsoft.Foo/widgets/{widgetName}")
op getWidget(@path subscriptionId: string, @path widgetName: string): void;

@route("/subscriptions/{subscriptionId}/providers/Microsoft.Foo/widgets/{name}")
op updateWidget(@path subscriptionId: string, @path name: string): void;
```

Multiple operations where the parent resource parameter name is inconsistent:

```tsp
@route("/providers/Microsoft.Contoso/foos/{fooName}/bars/{barName}")
op getBar(@path fooName: string, @path barName: string): void;

@route("/providers/Microsoft.Contoso/foos/{name}/bars/{barName}")
op updateBar(@path name: string, @path barName: string): void;
```

#### ✅ Correct

All operations use the same parameter names for the same path positions:

```tsp
@route("/subscriptions/{subscriptionId}/providers/Microsoft.Foo/widgets/{widgetName}")
op getWidget(@path subscriptionId: string, @path widgetName: string): void;

@put
@route("/subscriptions/{subscriptionId}/providers/Microsoft.Foo/widgets/{widgetName}")
op updateWidget(@path subscriptionId: string, @path widgetName: string): void;
```

Different paths with different parameter names (no conflict):

```tsp
@route("/providers/Microsoft.Contoso/foos/{fooName}")
op getFoo(@path fooName: string): void;

@route("/providers/Microsoft.Contoso/bars/{barName}")
op getBar(@path barName: string): void;
```
