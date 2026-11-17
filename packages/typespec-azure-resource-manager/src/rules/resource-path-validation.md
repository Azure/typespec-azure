GET, PUT, PATCH, and DELETE resource paths must include a resource type after the provider namespace and follow the ARM nested resource pattern. For GET responses and PUT requests, a payload with a JSON property named `location` must use a subscription and resource-group path, even if its model is not registered as a tracked resource.

Prefer the standard ARM resource operation templates, which build resource paths. This rule also checks custom operations. It recognizes singleton `default` names and extension paths, but some fully qualified extension paths can match the nested-path restriction; review and suppress those cases if appropriate.

## Impact

- **Area:** API, SDK

The rule is in the ARM library's `all` ruleset and is disabled in the Azure `resource-manager` ruleset. Enable `@azure-tools/typespec-azure-resource-manager/resource-path-validation` explicitly to adopt it.

## ❌ Incorrect

### Nested path

Adding a path parameter after the resource name does not identify a nested resource type:

```tsp
@armResourceOperations
interface Widgets {
  read is ArmResourceRead<
    Widget,
    Parameters = {
      @path other: string;
    }
  >;
}
```

### Location-bearing payload

```tsp
model Payload {
  location: string;
}

@route("/subscriptions/{subscriptionId}/providers/Microsoft.Test/widgets/{widget}")
@put
op create(@path subscriptionId: string, @path widget: string, @body body: Payload): void;
```

## ✅ Correct

### Nested path

Assuming `Widget` is an ARM resource, use its standard read operation without the extra parameter:

```tsp
@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
}
```

### Location-bearing payload

```tsp
model Payload {
  location: string;
}

@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets/{widget}")
@put
op create(
  @path subscriptionId: string,
  @path resourceGroupName: string,
  @path widget: string,
  @body body: Payload,
): void;
```

## Scope and limitations

The checks use resolved TypeSpec HTTP paths and single-model payloads, not emitted Swagger. Location is checked in the PUT request body or the lowest numeric successful GET response, including inherited properties and JSON names, with HTTP payload visibility. For multiple alternatives of the same status, any location-bearing alternative qualifies; union and multipart bodies are not inspected. Ranges, emitter schema sharing (including read-only properties in request schemas), SDK scope, version projections and `x-ms-paths` emission can differ from Swagger; full equivalence is not implied. A PUT is checked independently even when a GET at the same path has no successful response, unlike the Swagger handler which can discard the PUT finding.

The nested check implements the Swagger validator's specific patterns, not a generic even-segment requirement. The separate [`use-resource-path-for-put`](./use-resource-path-for-put.md) rule also checks PUT paths, but has a stricter resource-instance suffix requirement. If both are enabled, a PUT can receive both warnings. This rule reports a nested-path violation only once when it also matches the tracked nested check, while a distinct invalid scope can produce a separate warning.

Use `#suppress "@azure-tools/typespec-azure-resource-manager/resource-path-validation" "reason"` only for a reviewed exception. Place it on the operation, or on the concrete interface for an operation inherited from another interface; generic and library template declarations are not checked independently.

## Swagger mapping

This rule combines [PathContainsResourceType](https://github.com/Azure/azure-openapi-validator/blob/main/docs/path-contains-resource-type.md), [PathForNestedResource](https://github.com/Azure/azure-openapi-validator/blob/main/docs/path-for-nested-resource.md), and [PathForTrackedResourceTypes](https://github.com/Azure/azure-openapi-validator/blob/main/docs/path-for-tracked-resource-types.md). The three checks share one enablement and suppression ID.
