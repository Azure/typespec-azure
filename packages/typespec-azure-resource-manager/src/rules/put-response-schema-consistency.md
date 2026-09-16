An ARM PUT operation should return the same resource representation whether it
creates a resource (`201`) or replaces an existing resource (`200`). Reuse the
same response body type for both outcomes so clients can handle them consistently.

This ARM rule compares response body schemas only when an operation
declares both exact status codes and both have bodies. It
does not require either status code or a body, and does not compare `202`
responses or other HTTP verbs.

The HTTP body kinds must match. Shared types and structurally equal, undecorated
anonymous models and tuples are accepted. Tuple elements are compared in order,
including their types and the tuple length.
Distinct named types remain distinct schemas, even if their properties match.
Multipart bodies are not interchangeable with ordinary bodies, and tuples are
not interchangeable with arrays. Content types alone do not change native type
equality, including for `bytes`.

If either status declares multiple distinct body types or body kinds, this rule
skips the comparison because that status has no single unambiguous native body
to compare. This does not establish that the response variants are otherwise
valid. Multiple content types sharing one body type and body kind remain supported.

#### ❌ Incorrect

```tsp
import "@typespec/http";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using Azure.ResourceManager;

@service
@armProviderNamespace
namespace Microsoft.Contoso;

model Widget {
  name: string;
  description?: string;
}

model WidgetCreated {
  name: string;
  createdBy: string;
}

@route("/providers/Microsoft.Contoso/widgets/{widgetName}")
@put
op createOrUpdate(@path widgetName: string, @body body: Widget):
  | ArmResponse<Widget>
  | ArmCreatedResponse<WidgetCreated>
  | ErrorResponse;
```

#### ✅ Correct

```tsp
import "@typespec/http";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using Azure.ResourceManager;

@service
@armProviderNamespace
namespace Microsoft.Contoso;

model Widget {
  name: string;
  description?: string;
}

@route("/providers/Microsoft.Contoso/widgets/{widgetName}")
@put
op createOrUpdate(@path widgetName: string, @body body: Widget):
  | ArmResponse<Widget>
  | ArmCreatedResponse<Widget>
  | ErrorResponse;
```

## Impact

- **Area:** API, SDK

Different response schemas force callers to handle resource creation and
replacement differently. A single response model gives generated SDKs a
consistent result type for the same PUT operation.

## Suppression

Suppress only when an existing API contract cannot be corrected without a
breaking change and the inconsistency has been reviewed. Prefer reusing the same
response model. Place the directive above the affected operation:

```tsp
#suppress "@azure-tools/typespec-azure-resource-manager/put-response-schema-consistency" "Existing API contract returns different create and replace bodies."
```

## LintDiff Equivalent

This rule corresponds to
[`ConsistentResponseSchemaForPut`](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#consistentresponseschemaforput).
See the [original rule documentation](https://github.com/Azure/azure-openapi-validator/blob/main/docs/consistent-response-schema-for-put.md).
Unlike the original resolved-object identity comparison, this rule accepts
shared native types and equivalent plain anonymous models. It compares native
TypeSpec bodies, not emitted Swagger: lossy multipart and tuple representations
do not make different native bodies equal, and content-type-driven differences
in emitted `bytes` schemas do not make the same native body type unequal.
