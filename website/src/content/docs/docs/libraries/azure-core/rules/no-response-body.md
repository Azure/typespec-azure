---
title: "no-response-body"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-response-body
```

Ensure that the body is set correctly for response types. Non-204 responses should have a body, and 204 responses should not have a body.

#### ❌ Incorrect

Non-204 response without a body:

```tsp
@route("/api/widgets/{name}")
op readWidget(name: string): {
  @statusCode statusCode: 200;
};
```

Error response without a body:

```tsp
@error
model Error {
  @statusCode statusCode: 400;
}

@route("/api/widgets/{name}")
op readWidget(name: string): Error;
```

204 response with a body:

```tsp
@route("/api/widgets/{name}")
op deleteWidget(name: string): {
  @statusCode statusCode: 204;
  @body body: Widget;
};
```

#### ✅ Correct

Non-204 response with a body:

```tsp
@route("/api/widgets/{name}")
op readWidget(name: string): {
  @statusCode statusCode: 200;
  @body body: Widget;
};
```

204 response without a body:

```tsp
@route("/api/widgets/{name}")
op deleteWidget(name: string): {
  @statusCode statusCode: 204;
};
```
