Use an SDK method name beginning with `create` for ARM PUT operations, such as `create`,
`createOrUpdate`, or `createOrReplace`. This applies even when the operation
uses a standard ARM create template or only returns a success response for
updating an existing resource.

The rule checks the common TCGC SDK method name case-insensitively on concrete HTTP
endpoints, including aliases, inherited interface operations, and operations in
nested namespaces. Generic declarations and their internal instantiations are
not separate endpoints. When enabled, the rule does not require
`@armProviderNamespace`; select it for ARM APIs, not data-plane APIs with
different naming guidance. It is disabled by default in the `client-sdk` ruleset.

Name resolution uses TCGC's `getLibraryName`, including an unscoped `@clientName`
override and the usual `@friendlyName` fallback. Emitter-scoped overrides and
OpenAPI `@operationId` values do not define the common SDK method name and are
ignored.

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
before changing an existing SDK method name.

An unscoped `@clientName` can provide the correct SDK name without renaming the
TypeSpec operation:

```typespec
@armResourceOperations
interface Widgets {
  @Azure.ClientGenerator.Core.clientName("createOrUpdate")
  set is ArmResourceCreateOrReplaceAsync<Widget>;
}
```

Import `@azure-tools/typespec-client-generator-core` to use `@clientName`.

## Suppression

Suppression is acceptable when preserving an already-shipped SDK method name
requires an exception approved by the API reviewer. For new operations, fix
the SDK method name instead, either by renaming the operation or using `@clientName`.

```typespec
@armResourceOperations
interface Widgets {
  #suppress "@azure-tools/typespec-client-generator-core/use-create-for-put" "Preserve the already-shipped SDK method name."
  set is ArmResourceCreateOrReplaceAsync<Widget>;
}
```

## LintDiff Equivalent

This rule enforces the ARM SDK method-naming intent of
[`PutInOperationName`](https://github.com/Azure/azure-openapi-validator/blob/a970d991d2785184d2786b85e0a345dc3f37bc25/docs/put-in-operation-name.md)
([automated guideline R1006](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r1006)).
It does not reproduce Swagger `operationId` underscore or group-name exemptions.
Explicit OpenAPI IDs do not change the SDK method name checked by this rule;
unscoped SDK name overrides do. No emitter or version projection is used.
