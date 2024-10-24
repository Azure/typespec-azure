---
title: no-empty-model
---

```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/no-response-body

```

ARM response operations with status code 202 or 204 should not contain response body. Operations that are different for 202 and 204 should contain a response body.

### For 202 and 204 status codes (response body should be empty)

#### ❌ Incorrect

```tsp
model Test204BodyResponse {
  @statusCode statusCode: 204;
  @bodyRoot body: string;
}
op walk(): Test204BodyResponse;
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

#### ✅ Correct

```tsp
model Test204EmptyResponse {
  @statusCode statusCode: 202;
}
op walk(): Test204EmptyResponse;
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

### For operations different than 202 and 204 status codes (response body should not be empty)

#### ❌ Incorrect

```tsp
model Test201EmptyResponse {
  @statusCode statusCode: 201;
}
op walk(): Test201EmptyResponse;
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

#### ✅ Correct

```tsp
model Test201BodyResponse {
  @statusCode statusCode: 201;
  @bodyRoot body: string;
}
op walk(): Test201BodyResponse;
```

```json
{
  "responses": {
    "201": {
      "description": "The request has succeeded and a new resource has been created as a result.",
      "schema": {
        "type": "string"
      }
    }
  }
}
```
