Use an SDK method name beginning with `delete` for HTTP DELETE operations, such as
`delete` or `deleteWidget`. Consistent names make deletion methods easier to
discover in generated clients.

The rule checks the common TCGC SDK method name case-insensitively on concrete
HTTP service endpoints. It applies to ARM and data-plane services without requiring
`@armProviderNamespace`, and is disabled by default in the `client-sdk` ruleset.
Client-only declarations that are not service endpoints are not checked.

Name resolution uses TCGC's `getLibraryName` with `AllScopes`, including an
unscoped `@clientName`, exact names, and the supported `@friendlyName` fallback.
Overrides applying only to a particular language, such as
`@clientName("remove", "csharp")`, do not replace the common name.

The source program is checked without selecting an emitter or an API-version
projection. Historical names supplied through `@renamedFrom` are not reconstructed.

The following examples use generic HTTP authoring: import `@typespec/http`, use
`TypeSpec.Http`, and place the operation in a `@service` namespace. For ARM
resources, use the standard
[resource delete operation templates](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-operations#resource-delete-operations-delete),
with a name beginning with `delete`, such as
`delete is ArmResourceDeleteSync<Widget>;`.

#### ❌ Incorrect

```typespec
@delete
@route("/widgets/{id}")
op remove(@path id: string): void;
```

#### ✅ Correct

```typespec
@delete
@route("/widgets/{id}")
op deleteWidget(@path id: string): void;
```

## Impact

- **Area:** SDK

Renaming a method in an already-shipped SDK may introduce a breaking change.
Review compatibility before changing existing names.

An unscoped `@clientName` can provide the correct SDK name without renaming the
TypeSpec operation:

```typespec
@Azure.ClientGenerator.Core.clientName("deleteWidget")
@delete
@route("/widgets/{id}")
op remove(@path id: string): void;
```

Import `@azure-tools/typespec-client-generator-core` to use `@clientName`.

## Suppression

Suppression is appropriate when preserving an already-shipped SDK method name
requires an exception approved by the API reviewer. For new methods, fix the
name instead, either by renaming the operation or using an unscoped `@clientName`.
Use `#suppress` on the operation with a justification for the compatibility
exception:

```typespec
#suppress "@azure-tools/typespec-client-generator-core/use-delete-for-delete" "Preserve the already-shipped SDK method name."
@delete
@route("/widgets/{id}")
op remove(@path id: string): void;
```

## LintDiff Equivalent

This rule enforces the SDK naming intent of
[`DeleteInOperationName`](https://github.com/Azure/azure-openapi-validator/blob/main/docs/delete-in-operation-name.md).
It does not reproduce serialized `operationId` underscore or group-prefix
exemptions. Explicit OpenAPI operation IDs do not change the common SDK method
name checked by this rule. The lintdiff source checks authored operation names;
the promoted rule intentionally checks common SDK names, including unscoped
SDK name overrides.
