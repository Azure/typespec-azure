---
title: "rpc-operation-request-body"
---

```text title="Full name"
@azure-tools/typespec-azure-core/rpc-operation-request-body
```

Validates that `RpcOperation` request bodies are used correctly. Operations using HTTP verbs that do not support a body (like `GET` or `DELETE`) should not define one.

:::note
This rule only applies to `@get` and `@delete` operations. Other HTTP verbs like `@post`, `@put`, and `@patch` can have request bodies.
:::

#### ❌ Incorrect

GET operation with a request body:

```tsp
@get
op getWidget is RpcOperation<
  {
    @body body: Widget;
  },
  Widget
>;
```

DELETE operation with a request body:

```tsp
@delete
op deleteWidget is RpcOperation<
  {
    @body body: Widget;
  },
  Widget
>;
```

#### ✅ Correct

GET operation with no body:

```tsp
@get
op getWidget is RpcOperation<{}, Widget>;
```

DELETE operation with no body:

```tsp
@delete
op deleteWidget is RpcOperation<{}, Widget>;
```

GET/DELETE with query parameters using `@bodyIgnore`:

```tsp
@get
op get is RpcOperation<
  {
    @bodyIgnore options: {
      @query foo: string;
    };
  },
  {}
>;
```
