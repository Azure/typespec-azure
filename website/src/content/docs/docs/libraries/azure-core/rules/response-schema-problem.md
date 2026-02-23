---
title: "response-schema-problem"
---

```text title="Full name"
@azure-tools/typespec-azure-core/response-schema-problem
```

Warn about operations having multiple non-error response schemas. If an operation has multiple response types for different success status codes, you may have forgotten to add `@error` to one of them.

#### ❌ Incorrect

Multiple success responses with different body schemas:

```tsp
@error
model Error {
  code: int32;
  message: string;
}

model Return200 {
  @statusCode status: 200;
  @body body: string;
}

model Return201 {
  @statusCode status: 201;
  @body body: int32;
}

op test(): Return200 | Return201 | Error;
```

#### ✅ Correct

Single success response schema with an error response:

```tsp
@error
model Error {
  code: int32;
  message: string;
}

model Return200 {
  @statusCode status: 200;
  @body body: string;
}

op test(): Return200 | Error;
```
