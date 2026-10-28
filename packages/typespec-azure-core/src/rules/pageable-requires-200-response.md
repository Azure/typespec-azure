Operations marked with `@list` that return an `@nextLink` must define an HTTP 200 response.

The AutoRest emitter generates `x-ms-pageable` for these operations. AutoRest requires a 200 response when this extension is present, even if the operation uses POST or defines another successful response such as 201.

This rule applies to both ARM and data-plane operations, regardless of HTTP verb. It does not apply to ordinary operations or to lists without next-link paging. Implicit 200 responses are accepted; a default response or a `2XX` status-code range does not replace an explicit 200 response.

## Impact

- **Area:** API, SDK

A pageable operation without a 200 response does not satisfy the AutoRest paging contract and can produce an incorrect SDK response.

### Standard ARM lists

For a tracked resource named `Widget`, keep the standard list template's 200 response instead of replacing it with a 201 response.

#### ❌ Incorrect

```tsp
op listByResourceGroup is ArmResourceListByParent<
  Widget,
  Response = {
    @statusCode status: 201;
    @body body: ResourceListResult<Widget>;
  }
>;
```

#### ✅ Correct

```tsp
op listByResourceGroup is ArmResourceListByParent<Widget>;
```

### Pageable data-plane POST operations

The same requirement applies to a search operation using `RpcOperation` and the standard `Page<Widget>` response body.

#### ❌ Incorrect

```tsp
@list
@post
@route("/widgets:search")
op searchWidgets is RpcOperation<
  {},
  {
    @statusCode status: 201;
    @body body: Page<Widget>;
  }
>;
```

#### ✅ Correct

```tsp
@list
@post
@route("/widgets:search")
op searchWidgets is RpcOperation<
  {},
  {
    @statusCode status: 200;
    @body body: Page<Widget>;
  }
>;
```

## LintDiff Equivalent

[PageableRequires200Response](https://github.com/Azure/azure-openapi-validator/blob/main/docs/pageable-requires200-response.md)

The Swagger rule is an error. This TypeSpec rule is a warning, consistent with the other Azure Core linter rules. It checks the presence of a 200 response, not the response schema or next-link property. Legacy `x-ms-pageable` operations with `nextLinkName: null` are outside this rule's native next-link paging scope.

## Enable

This rule is initially opt-in in the standard Azure data-plane and resource-manager rulesets.

The ARM `use-standard-response-codes` rule also requires 200 for GET operations in services when explicitly enabled, but permits POST 201. This common paging rule supplies the missing non-GET and data-plane check. Enabling both rules can report the same missing 200 on a pageable GET; fixing the response resolves both findings. If retaining an existing API, suppress the overlapping finding on that operation rather than disabling GET coverage or changing ruleset defaults.

```yaml
linter:
  enable:
    "@azure-tools/typespec-azure-core/pageable-requires-200-response": true
```

## Suppression

Suppress only when required to describe an existing API. Changing a service's response status code may require a service change and can break existing clients.
