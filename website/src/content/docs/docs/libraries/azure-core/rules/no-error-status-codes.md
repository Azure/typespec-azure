---
title: "no-error-status-codes"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-error-status-codes
```

Azure REST API guidelines recommend using the `default` error response for all error cases. Avoid defining custom 4xx or 5xx error status codes individually.

#### ❌ Incorrect

Custom 4xx error status code:

```tsp
op readWidget(name: string): Widget | {
  @statusCode statusCode: 404;
  @body message: "Not Found";
};
```

Custom 5xx error status code:

```tsp
op readWidget(name: string): Widget | {
  @statusCode statusCode: 503;
  @body message: "Service Unavailable";
};
```

#### ✅ Correct

Use `default` for the error response:

```tsp
op readWidget(name: string): Widget | {
  @statusCode statusCode: "default";
  @body error: Error;
};
```
