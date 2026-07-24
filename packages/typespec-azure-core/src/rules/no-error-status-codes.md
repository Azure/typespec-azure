Azure REST API guidelines recommend using the `default` error response for all error cases. Avoid defining custom 4xx or 5xx error status codes individually.

## Impact

- **Area:** API, SDK

Using error status codes in a non-standard way makes the API difficult to consume.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [NoErrorCodeResponses](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md).

#### ❌ Incorrect

Custom 4xx error status code:

```tsp
op readWidget(name: string):
  | Widget
  | {
      @statusCode statusCode: 404;
      @body message: "Not Found";
    };
```

Custom 5xx error status code:

```tsp
op readWidget(name: string):
  | Widget
  | {
      @statusCode statusCode: 503;
      @body message: "Service Unavailable";
    };
```

#### ✅ Correct

Use `default` for the error response:

```tsp
op readWidget(name: string):
  | Widget
  | {
      @statusCode statusCode: "default";
      @body error: Error;
    };
```

## Suppression

Suppress only when required to match an existing API; otherwise use the standard operation templates.
