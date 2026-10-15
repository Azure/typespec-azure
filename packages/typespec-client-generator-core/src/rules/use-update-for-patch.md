Use an SDK method name beginning with `update` for ARM PATCH operations, such as
`update`, `updateTags`, or `updateWidget`. This applies even when the operation uses
a standard ARM patch template, independently of its response status codes.

The rule checks the common TCGC SDK method name case-insensitively on concrete HTTP
endpoints. When enabled, it does not require `@armProviderNamespace`; select it for
ARM APIs, not data-plane APIs with different naming guidance. It is disabled by
default in the `client-sdk` ruleset.

Name resolution uses TCGC's `getLibraryName`, including an unscoped `@clientName`
override, `exact` client names, and the usual `@friendlyName` fallback.
Emitter-scoped overrides and OpenAPI `@operationId` values do not define the common
SDK method name and are ignored.

The source program is checked, including operations removed in later versions.
Historical names supplied through `@renamedFrom` are not reconstructed.

#### ❌ Incorrect

```typespec
@armResourceOperations
interface Widgets {
  modify is ArmResourcePatchSync<Widget, Properties = WidgetProperties>;
}
```

#### ✅ Correct

```typespec
@armResourceOperations
interface Widgets {
  update is ArmResourcePatchSync<Widget, Properties = WidgetProperties>;
}
```

These examples assume an ARM service, a tracked resource named `Widget`, and its
property model `WidgetProperties`.

## Impact

- **Area:** SDK

Consistent update-method naming makes partial updates easier to discover in
generated clients. Renaming a method after an SDK has shipped may introduce a
breaking change to its public API. Review compatibility before changing an
existing SDK method name.

An unscoped `@clientName` can provide the correct SDK name without renaming the
TypeSpec operation:

```typespec
@armResourceOperations
interface Widgets {
  @Azure.ClientGenerator.Core.clientName("updateWidget")
  modify is ArmResourcePatchSync<Widget, Properties = WidgetProperties>;
}
```

Import `@azure-tools/typespec-client-generator-core` to use `@clientName`.

## Suppression

Suppression is acceptable when preserving an already-shipped SDK method name
requires an exception approved by the API reviewer. For new operations, fix the
SDK method name instead, either by renaming the operation or using `@clientName`.

```typespec
@armResourceOperations
interface Widgets {
  #suppress "@azure-tools/typespec-client-generator-core/use-update-for-patch" "Preserve the already-shipped SDK method name."
  modify is ArmResourcePatchSync<Widget, Properties = WidgetProperties>;
}
```

## LintDiff Equivalent

This rule enforces the ARM SDK method-naming intent of
[`PatchInOperationName`](https://github.com/Azure/azure-openapi-validator/blob/aec54e95e52338d0afa911a92958541d5624c105/docs/patch-in-operation-name.md).
It follows TCGC's `use-create-for-put` common SDK naming pattern rather than
reproducing Swagger `operationId` group-name exemptions or checking only authored
TypeSpec names. Common SDK name overrides intentionally affect this rule; no
emitter or version projection is used.
