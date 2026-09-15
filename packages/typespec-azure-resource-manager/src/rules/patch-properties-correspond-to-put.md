PATCH request bodies should update properties that the corresponding PUT request can set.
Keeping their JSON property names consistent gives clients a predictable resource update contract.

This rule pairs PUT and PATCH operations on the same HTTP route. It requires a nonempty PATCH
body and a corresponding PUT body, then checks that each PATCH leaf property has a matching JSON
name in PUT. It does not require property descriptions, constraints, or types to be identical.
Direct nested payload properties are compared by leaf name rather than their full nesting path;
inherited-only nested wrappers remain leaves. Explicit JSON names, inherited properties, request
visibility, and discriminator properties participate in the comparison.

## Incorrect

```typespec
using TypeSpec.Http;

@service
namespace Contoso.Widgets;

model WidgetCreate {
  name?: string;
}

model WidgetUpdate {
  displayName?: string;
}

@route("/widgets/{id}")
@put
op createOrUpdate(@path id: string, @body body: WidgetCreate): void;

@route("/widgets/{id}")
@patch
op update(@path id: string, @body body: WidgetUpdate): void;
```

`displayName` has no corresponding JSON property in the PUT body.

## Correct

```typespec
using TypeSpec.Http;

@service
namespace Contoso.Widgets;

model WidgetCreate {
  name?: string;
}

model WidgetUpdate {
  name?: string;
}

@route("/widgets/{id}")
@put
op createOrUpdate(@path id: string, @body body: WidgetCreate): void;

@route("/widgets/{id}")
@patch
op update(@path id: string, @body body: WidgetUpdate): void;
```

These examples use `TypeSpec.Http` decorators. In an ARM service, prefer the standard resource
operation templates; this check also covers custom HTTP operations without requiring provider
namespace metadata.

## Versioned services

Added and removed operations, interfaces, body parameters, and properties are compared within each
service version and its selected dependency versions. For example, removing a property from PUT
while retaining it in PATCH produces a warning. Repeated warnings for a shared source property
are deduplicated across versions and services, while distinct property targets remain separate.

This is availability-aware comparison, not historical shape projection. Historical renames,
property or body type changes, and route changes are not reconstructed; names and types come from
the current semantic graph, so historical results involving those changes can be inaccurate.
Same-endpoint overload siblings are skipped in favor of the base operation.

The rule is available but disabled by default in the Azure resource manager ruleset.

## LintDiff Equivalent

This rule implements the property-presence intent of
[PatchPropertiesCorrespondToPutProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/patch-properties-correspond-to-put-properties.md).
It intentionally does not reproduce whole-schema deep-equality comparisons of descriptions or
client-name metadata, and detects empty body models that the validator misses. Native overload
coverage does not establish Swagger equivalence because the corresponding comparison fixture
cannot be emitted. Records, nullable models, empty models, and arbitrary model unions can trigger
other ARM restrictions; fallback handling here does not make those shapes supported ARM authoring.
