```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/no-response-body

```

This keeps ARM response schemas aligned with how clients interpret long-running or empty success responses versus success responses that return resource data.

## Impact

- **Area:** API

## For 202 and 204 status codes (response body should be empty)

A response - usually a 202 - carries a body that should be empty.

### ❌ Incorrect

```tsp
op walk(): ArmNoContentResponse & {
  @body body: string;
};
```

```json
{
  "responses": {
    "204": {
      "description": "There is no content to send for this request, but the headers may be useful. ",
      "schema": {
        "type": "string"
      }
    }
  }
}
```

### ✅ Correct

```tsp
op walk(): ArmAcceptedResponse;
```

```json
{
  "responses": {
    "202": {
      "description": "The request has been accepted for processing, but processing has not yet completed."
    }
  }
}
```

## For other success (2xx) response status codes (response body should not be empty)

### ❌ Incorrect

```tsp
op walk(): CreatedResponse;
```

```json
{
  "responses": {
    "201": {
      "description": "The request has succeeded and a new resource has been created as a result."
    }
  }
}
```

### ✅ Correct

```tsp
op walk(): ArmCreatedResponse<{
  name: string;
}>;
```

```json
{
  "responses": {
    "201": {
      "description": "Azure create operation completed successfully.",
      "schema": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          }
        },
        "required": ["name"]
      }
    }
  }
}
```

## Suppression

Suppress at will for 202, but never for 204. Use the standard operation and response templates.
