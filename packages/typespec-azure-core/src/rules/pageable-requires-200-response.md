Operations marked with `@list` that return an `@nextLink` must define an HTTP 200 response.

The AutoRest emitter generates `x-ms-pageable` for these operations. AutoRest requires a 200 response when this extension is present, even if the operation uses POST or defines another successful response such as 201.

This rule applies to both ARM and data-plane operations, regardless of HTTP verb. It does not apply to ordinary operations or to lists without next-link paging. Implicit 200 responses are accepted; a default response or a `2XX` status-code range does not replace an explicit 200 response.

## Impact

- **Area:** API, SDK

A pageable operation without a 200 response does not satisfy the AutoRest paging contract and can produce an incorrect SDK response.

#### ❌ Incorrect

```tsp
model WidgetPage {
  @pageItems value: Widget[];
  @nextLink nextLink?: url;
}

@list
@post
op searchWidgets(): {
  @statusCode status: 201;
  @body body: WidgetPage;
};
```

#### ✅ Correct

```tsp
@list
@post
op searchWidgets(): {
  @statusCode status: 200;
  @body body: WidgetPage;
};
```

## LintDiff Equivalent

[PageableRequires200Response](https://github.com/Azure/azure-openapi-validator/blob/main/docs/pageable-requires200-response.md)

The Swagger rule is an error. This TypeSpec rule is a warning, consistent with the other Azure Core linter rules. It checks the presence of a 200 response, not the response schema or next-link property.

## Enable

This rule is initially opt-in in the standard Azure data-plane and resource-manager rulesets.

```yaml
linter:
  enable:
    "@azure-tools/typespec-azure-core/pageable-requires-200-response": true
```

## Suppression

Suppress only when required to describe an existing API. Changing a service's response status code may require a service change and can break existing clients.
