GET operations generate SDK methods whose names should clearly communicate whether they retrieve one
resource or list several resources. Use `get` or `list` in TypeSpec so the generated SDK method name
starts with `Get` or `List`.

Changing a method name after publishing an SDK can be a breaking change.

## Impact

- **Area:** SDK generation. A GET operation without `Get` or `List` is less discoverable and does
  not clearly communicate whether it returns one resource or a collection.
- **Compatibility:** Renaming a generated method after an SDK has shipped can break existing client
  code.

## Examples

### Incorrect

```tsp
@route("/widgets/{name}")
@get
op fetchWidget(@path name: string): Widget;
```

### Correct

```tsp
@route("/widgets/{name}")
@get
op getWidget(@path name: string): Widget;
```

List operations may start with `list`.

```tsp
@route("/widgets")
@get
op listWidgets(): Widget[];
```

## Suppression

Suppress this warning only when the SDK method has already shipped and renaming it would be a
breaking change. Document the compatibility reason in the suppression:

```tsp
#suppress "@azure-tools/typespec-client-generator-core/get-operation-name" "Preserve the shipped SDK method name."
@route("/widgets/{name}")
@get
op fetchWidget(@path name: string): Widget;
```

## LintDiff Equivalent

This rule corresponds to the Azure OpenAPI Validator
[`GetInOperationName` (R1005)](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r1005).
