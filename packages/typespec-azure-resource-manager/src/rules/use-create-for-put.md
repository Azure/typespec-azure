Use a name beginning with `create` for ARM PUT operations, such as `create`,
`createOrUpdate`, or `createOrReplace`. This applies even when the operation
uses a standard ARM create template or only returns a success response for
updating an existing resource.

The rule checks the authored operation name case-insensitively on concrete HTTP
endpoints, including aliases, inherited interface operations, and operations in
nested namespaces. Generic declarations and their internal instantiations are
not separate endpoints. When enabled, the rule does not require
`@armProviderNamespace`; select it for ARM APIs, not data-plane APIs with
different naming guidance.

The source program is checked, including operations removed in later versions.
Historical names supplied through `@renamedFrom` are not reconstructed.

#### ❌ Incorrect

```typespec
@armResourceOperations
interface Widgets {
  set is ArmResourceCreateOrReplaceAsync<Widget>;
}
```

#### ✅ Correct

```typespec
@armResourceOperations
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
}
```

## Impact

- **Area:** SDK

Consistent create-method naming makes resource creation and replacement easier
to discover in generated clients. Renaming an operation after an SDK has shipped
may introduce a breaking change to its public methods. Review compatibility
before changing an existing operation name.

## Suppression

Suppression is acceptable when preserving an already-shipped SDK method name
requires an exception approved by the API reviewer. For new operations, fix
the authored name instead.

```typespec
@armResourceOperations
interface Widgets {
  #suppress "@azure-tools/typespec-azure-resource-manager/use-create-for-put" "Preserve the already-shipped SDK method name."
  set is ArmResourceCreateOrReplaceAsync<Widget>;
}
```

## LintDiff Equivalent

This rule covers the ARM authored-name contract of
[`PutInOperationName`](https://github.com/Azure/azure-openapi-validator/blob/a970d991d2785184d2786b85e0a345dc3f37bc25/docs/put-in-operation-name.md)
([automated guideline R1006](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r1006)).
It does not reproduce Swagger `operationId` underscore or group-name exemptions.
Explicit OpenAPI IDs and SDK name overrides do not change the authored name
checked by this rule; no emitter or version projection is used.
