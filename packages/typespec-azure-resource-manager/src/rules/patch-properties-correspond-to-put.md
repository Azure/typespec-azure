PATCH request bodies should update properties that the corresponding PUT request can set.
Keeping their JSON property names consistent gives clients a predictable resource update contract.

This rule pairs project PUT and PATCH operations on the same HTTP route. It checks that each
effective PATCH leaf property has a matching JSON name in the effective PUT input. It does not
require property descriptions, constraints, or types to be identical.
Direct nested payload properties are compared by leaf name rather than their full nesting path;
inherited-only nested wrappers remain leaves. Explicit JSON names, inherited properties, request
visibility, and authored discriminator properties participate in the comparison.

## Effective input and rule ownership

Each operation's resolved request visibility determines its input. Only authored discriminator
properties participate in the comparison.
Read-only and Create-only properties excluded from ordinary PATCH input are ignored.
Explicit `@parameterVisibility` overrides are respected independently for PUT and PATCH.
HTTP metadata inside `@body` remains JSON input; transport metadata inside `@bodyRoot` is excluded.

Using the same named resource model does not guarantee identical input. For example, PUT with
`@parameterVisibility(Lifecycle.Create)` excludes an Update-only property that PATCH can accept.
That mismatch is still checked even though resource-model identity and PATCH-to-resource layout
checks can both pass. Adding unrelated, excluded properties does not change this comparison.

The rule does not diagnose a missing PUT body. PUT-body validity is a separate concern from
property correspondence, covered by `put-resource-schema-consistency` when enabled.
This rule does not require a PUT operation to exist either. An absent or `void`
PUT body skips correspondence, including when a body parameter is unavailable in a service version.

For paired operations, missing or `void` PATCH bodies and object bodies with no effective input
properties are diagnosed. Declared properties alone do not establish nonempty effective input.
These diagnostics do not depend on the corresponding PUT having a usable body.

Required envelope properties remain the responsibility of [`patch-envelope`](./patch-envelope.md)
and [`arm-resource-patch`](./arm-resource-patch.md).
For example, a resource's supported `tags` must be exposed in its PATCH schema, but need not be
required in every PATCH request. This rule does not add another tags diagnostic.
Recursive PATCH-to-resource layout and safety validation is the separate responsibility of
`no-unsafe-patch-body-properties`.
This leaf-name comparison is not a replacement for that rule's nesting checks.

## Supported bodies

Correspondence applies to single object document bodies, including nullable single-model unions.
Scalar, array, record/indexed, multipart, and multi-model union bodies are outside this rule's
comparison scope; they are not treated as empty object schemas. Other ARM rules govern whether
such bodies are permitted.

Within object bodies, arrays, records, empty models, and multi-model unions retain leaf-property
comparison rather than element, indexer, or variant expansion. Recursive models terminate at
cycles. This rule is a property-name check, not whole-model assignability.

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
client-name metadata, and detects empty effective object bodies that the validator misses.
It uses native request visibility and authored properties rather than emitted schema sharing or
synthesized discriminators. Missing PUT-body reporting is delegated rather than duplicated.
Native overload
coverage does not establish Swagger equivalence because the corresponding comparison fixture
cannot be emitted. Records, nullable models, empty models, and arbitrary model unions can trigger
other ARM restrictions; fallback handling here does not make those shapes supported ARM authoring.

## Impact

- **Area:** API

PATCH properties absent from PUT input create inconsistent resource-update contracts, even when
both operations reference the same resource model.

## Suppression

Prefer correcting the request model or operation visibility. Suppress only for a documented
existing contract that intentionally differs and cannot be changed compatibly, using
`#suppress "@azure-tools/typespec-azure-resource-manager/patch-properties-correspond-to-put" "<reason>"`
above the reported declaration.
