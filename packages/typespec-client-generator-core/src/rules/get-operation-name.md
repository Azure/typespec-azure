GET operations generate SDK methods whose names should clearly communicate whether they retrieve one
resource or list several resources. Use `get` or `list` in TypeSpec so the emitted operation ID starts
with `Get` or `List`, either directly or after an operation-group prefix.

Changing an operation ID after publishing an SDK can be a breaking change.

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

## LintDiff Equivalent

This rule is equivalent to the Azure OpenAPI Validator
[`GetInOperationName`](https://github.com/Azure/azure-openapi-validator/blob/main/docs/get-in-operation-name.md)
rule.
