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

The following ARM examples use the standard
[resource delete operation template](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-operations#resource-delete-operations-delete).
The template supplies the DELETE route and response; the operation alias supplies
the SDK method name. The same naming requirement applies to data-plane services.

Use this shared setup before each example:

```typespec
import "@typespec/http";
import "@typespec/rest";
import "@azure-tools/typespec-azure-resource-manager";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Http;
using TypeSpec.Rest;
using Azure.ResourceManager;
using Azure.ClientGenerator.Core;

@armProviderNamespace
@service
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Example;

model Widget is ProxyResource<WidgetProperties> {
  @key("widgetName") @segment("widgets") name: string;
}

model WidgetProperties {}
```

#### ❌ Incorrect

```typespec
@armResourceOperations
interface Widgets {
  remove is ArmResourceDeleteSync<Widget>;
}
```

#### ✅ Correct

```typespec
@armResourceOperations
interface Widgets {
  delete is ArmResourceDeleteSync<Widget>;
}
```

## Impact

- **Area:** SDK

Renaming a method in an already-shipped SDK may introduce a breaking change.
Review compatibility before changing existing names.

An unscoped `@clientName` can provide the correct SDK name without renaming the
TypeSpec operation:

```typespec
@armResourceOperations
interface Widgets {
  @clientName("deleteWidget")
  remove is ArmResourceDeleteSync<Widget>;
}
```

The shared setup imports `@azure-tools/typespec-client-generator-core` and uses
`Azure.ClientGenerator.Core` to make `@clientName` available.

## Suppression

Suppression is appropriate when preserving an already-shipped SDK method name
requires an exception approved by the API reviewer. For new methods, fix the
name instead, either by renaming the operation or using an unscoped `@clientName`.
Use `#suppress` on the operation with a justification for the compatibility
exception:

```typespec
@armResourceOperations
interface Widgets {
  #suppress "@azure-tools/typespec-client-generator-core/use-delete-for-delete" "Preserve the already-shipped SDK method name."
  remove is ArmResourceDeleteSync<Widget>;
}
```

## LintDiff Equivalent

This rule enforces the SDK naming intent of
[`DeleteInOperationName`](https://github.com/Azure/azure-openapi-validator/blob/main/docs/delete-in-operation-name.md).
It does not reproduce serialized `operationId` underscore or group-prefix
exemptions. Explicit OpenAPI operation IDs do not change the common SDK method
name checked by this rule. The lintdiff source checks authored operation names;
the promoted rule intentionally checks common SDK names, including unscoped
SDK name overrides.
