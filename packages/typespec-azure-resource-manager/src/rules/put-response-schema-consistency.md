An ARM PUT operation should return the same resource representation whether it
creates a resource (`201`) or replaces an existing resource (`200`). Reuse the
same response body type for both outcomes so clients can handle them consistently.

This ARM rule compares response body schemas only when an operation
declares both exact status codes and both have bodies. It
does not require either status code or a body, and does not compare `202`
responses or other HTTP verbs.

Shared types and structurally equal, undecorated anonymous models are accepted.
Distinct named types remain distinct schemas, even if their properties match.
The comparison also accounts for equivalent emitted binary, multipart, and tuple
response schemas.

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
#suppress "put-response-schema-consistency" "Existing API contract returns different create and replace bodies."
```

## LintDiff Equivalent

This rule corresponds to
[`ConsistentResponseSchemaForPut`](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#consistentresponseschemaforput).
See the [original rule documentation](https://github.com/Azure/azure-openapi-validator/blob/main/docs/consistent-response-schema-for-put.md).
Unlike the original resolved-object identity comparison, this rule accepts
identical external references and equivalent inline schemas.
