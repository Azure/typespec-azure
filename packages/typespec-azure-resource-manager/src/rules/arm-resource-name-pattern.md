Resource names must specify a pattern string using `@pattern`, providing a regular expression that the name must match.

## Impact

- **Area:** API

The resource name lacks the required pattern restriction, violating the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [ResourceNameRestriction](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md).

#### ❌ Incorrect

```tsp
model Employee is ProxyResource<{}> {
  @key("employeeName")
  @path
  @segment("employees")
  name: string;
}
```

#### ✅ Correct

```tsp
model Employee is ProxyResource<{}> {
  ...ResourceNameParameter<Employee>;
}
```

## Suppression

Suppress only when required to match an existing API; otherwise use `@pattern` or the `ResourceNameParameter` template with a pattern string or union type.
