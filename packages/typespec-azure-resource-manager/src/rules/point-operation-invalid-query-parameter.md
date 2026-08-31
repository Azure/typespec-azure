ARM point operations using GET, PUT, PATCH, or DELETE must not define query parameters other than `api-version`.

## Impact

- **Area:** API, SDK

Additional query parameters on point operations make the resource contract inconsistent with ARM RPC guidance and can complicate generated SDK method signatures.

## LintDiff Equivalent

This rule corresponds to the Swagger linter rule [ValidQueryParametersForPointOperations](https://github.com/Azure/azure-openapi-validator/blob/main/docs/valid-query-parameters-for-point-operations.md).

#### ❌ Incorrect

```tsp
model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

model WidgetProperties {}

model ExtraReadParameters {
  @query expand?: string;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget, Parameters = ExtraReadParameters>;
}
```

#### ✅ Correct

```tsp
model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

model WidgetProperties {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
}
```

Query parameters remain valid on collection operations because they are outside this rule's scope:

```tsp
model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

model WidgetProperties {}

@armResourceOperations
interface Widgets {
  list is ArmResourceListByParent<Widget, Parameters = ArmTopParameter>;
}
```

## Suppression

Do not suppress this rule unless the operation is intentionally exempt from ARM RPC guidance. Remove the additional query parameter or model the API as a collection or action operation when that better reflects its semantics.
