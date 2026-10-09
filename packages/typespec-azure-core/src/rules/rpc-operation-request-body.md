Validates that `RpcOperation` request bodies are used correctly. Operations using HTTP verbs that do not support a body (like `GET` or `DELETE`) should not define one.

:::note
This rule only applies to `@get` and `@delete` operations. Other HTTP verbs like `@post`, `@put`, and `@patch` can have request bodies.
:::

## Impact

- **Area:** API

An `RpcOperation` with an improperly modeled request body produces an unclear API contract.

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

POST operation with a body:

```tsp
@post
op createWidget is RpcOperation<
  {
    @body body: Widget;
  },
  Widget
>;
```

## Suppression

Suppress only when required to match an existing API; otherwise model the request body with the standard patterns.
