Warn about operations having multiple non-error response schemas. If an operation has multiple response types for different success status codes, you may have forgotten to add `@error` to one of them.

## Impact

- **Area:** API, SDK

May indicate a missing response status code, since a response is modeled as an inline union.

#### ❌ Incorrect

Multiple success responses with different body schemas:

```tsp
model Widget {
  name: string;
}

model WidgetCreated {
  name: string;
  creationResult: string;
}

@error
model Error {
  code: int32;
  message: string;
}

model WidgetResponse {
  @statusCode status: 200;
  @body body: Widget;
}

model WidgetCreatedResponse {
  @statusCode status: 201;
  @body body: WidgetCreated;
}

op test(): WidgetResponse | WidgetCreatedResponse | Error;
```

#### ✅ Correct

Single success response schema with an error response:

```tsp
@error
model Error {
  code: int32;
  message: string;
}

model WidgetResponse {
  @statusCode status: 200 | 201;
  @body body: Widget;
}

op test(): WidgetResponse | Error;
```

## Suppression

Suppress only in the unlikely case a single response is best represented as an inline union; otherwise use the standard operation templates.
