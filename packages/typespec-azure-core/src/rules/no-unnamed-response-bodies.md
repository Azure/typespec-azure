Operation response bodies should use named models rather than anonymous models with implicit payload properties.

## Impact

- **Area:** SDK, API

A named response model gives client generators a reusable type and helps authors keep responses consistent across operations.

## Examples

#### Incorrect

For an ARM resource read, use `ArmResourceRead` and customize its `Response` only when needed. Adding a payload property outside a named model creates an anonymous response shape:

```tsp
import "@typespec/http";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using Azure.ResourceManager;

@service
@armProviderNamespace("Microsoft.Contoso")
namespace Microsoft.Contoso;

model WidgetProperties {
  value: string;
}

model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<
    Widget,
    Response = {
      @statusCode status: 200;
      ...Widget;
      etag: string;
    }
  >;
}
```

#### Correct

Define the complete payload as a named model and spread it into the customized response:

```tsp
import "@typespec/http";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using Azure.ResourceManager;

@service
@armProviderNamespace("Microsoft.Contoso")
namespace Microsoft.Contoso;

model WidgetProperties {
  value: string;
}

model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

model WidgetResponse extends Widget {
  etag: string;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<
    Widget,
    Response = {
      @statusCode status: 200;
      ...WidgetResponse;
    }
  >;
}
```

A complete spread can reuse a named model even when headers or status codes are declared inside the named model, outside its spread, or in both places. Adding payload properties outside the named model creates a new anonymous response shape and is reported.

When no custom response is needed, prefer `ArmResourceRead<Widget>` without a `Response` override. Its default response uses an explicit `@bodyRoot`, which is outside this rule's scope. Concrete operations declared with `is ArmResourceRead<...>` are still checked when their customized responses have implicit payloads.

## Scope

The rule checks implicit model response bodies on project operations. It reports each anonymous response declaration once, including declarations shared by multiple operations or imported from another project file. Anonymous aliases and intersections are checked by their semantic model identity.

Each model alternative in a response union is checked, including nested unions. Responses sharing a status code but using different content types are checked independently: changing the order of JSON and XML alternatives does not change which declarations are reported. Diagnostics target the original model expressions, not synthesized HTTP payloads, and reuse across operations or status codes does not duplicate a warning.

Named responses, complete spreads of a named payload, empty responses, scalar and array responses, and operation templates are not reported. Library operations are excluded.

Explicit `@body` and `@bodyRoot` properties are outside this rule's scope. Anonymous models in those property positions are covered by [no-unnamed-types](./no-unnamed-types.md).

This rule is available but disabled by default in the Azure data-plane and resource-manager rulesets.

## Suppression

Suppress only when an existing API requires an anonymous response shape that cannot be represented by a named model without changing the contract. Prefer extracting a named payload model for new APIs.

## LintDiff Equivalent

This rule covers implicit response models from [AvoidAnonymousTypes](https://github.com/Azure/azure-openapi-validator/blob/main/docs/avoid-anonymous-types.md). Together with `no-unnamed-types`, it checks authorable anonymous model positions without depending on emitted OpenAPI schemas.
