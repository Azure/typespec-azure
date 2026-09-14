PATCH request body properties must exist at the same nesting level in the resource
model. A PATCH body may omit resource properties, but must not introduce new
properties or move them between the resource envelope and nested objects.
Consistent shapes let API consumers and generated SDKs update a resource using
the same property layout they receive when reading it.

This rule checks all HTTP PATCH operations, including custom operations that do
not use ARM lifecycle templates. It selects the comparison body from the PATCH
`200` response, then `201`, then a same-path GET `200` or `201` response. An exact
status code takes precedence over a range containing that code. Without a model
request body or an eligible comparison body, there is nothing to compare.

The comparison uses JSON encoded names and includes inherited properties and
discriminators. Derived declarations replace inherited properties by their
authored name, including when a `never` override removes a property. Nullable
objects are compared recursively. Effective authored properties across the entire
inheritance chain take precedence over synthesized discriminator metadata. Array
elements, record keys, and scalar values are not checked as named properties.
This is a property layout check, not a check of property types or requiredness.

## Incorrect

`displayName` is nested under `properties` in the resource but is at the top level
in the PATCH request:

```typespec
using TypeSpec.Http;

@service
namespace Contoso.Widgets;

model Widget {
  properties: {
    displayName?: string;
    description?: string;
  };
}

model WidgetUpdate {
  displayName?: string;
}

@route("/widgets/{name}")
@patch
op update(@path name: string, @body body: WidgetUpdate): Widget;
```

## Correct

Keep the same nesting and include only the properties that can be updated:

```typespec
using TypeSpec.Http;

@service
namespace Contoso.Widgets;

model Widget {
  properties: {
    displayName?: string;
    description?: string;
  };
}

model WidgetUpdate {
  properties?: {
    displayName?: string;
  };
}

@route("/widgets/{name}")
@patch
op update(@path name: string, @body body: WidgetUpdate): Widget;
```

## Native contract

This rule checks the current compiler program without running an emitter or
selecting an API-version projection. Client-generator scope annotations do not
remove operations or properties from this comparison. Diagnostics identify
authored properties, or the model for an implicit discriminator. A reused
property can be reported for multiple paths or operations.

The rule is available from the ARM library without requiring an
`@armProviderNamespace` decorator. It complements `arm-resource-patch`, which
checks registered resource PATCH operations and top-level envelope requirements.
It is initially disabled in the shared Azure resource-manager ruleset.

## LintDiff Equivalent

This rule provides partial equivalence to
[ConsistentPatchProperties](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/docs/consistent-patch-properties.md).
That validator checks emitted schemas; this rule checks native declarations.
Emitter scope and API-version selection can therefore produce different
results. Inherited `never` overrides can also differ: the native model excludes
the property, while an emitted `allOf` reference can retain the base property.
The validator correctly checks that emitted schema rather than the native
override. Similarly, an emitted discriminator can replace an inherited encoded
object property, while the native comparison retains that authored object's
shape. The native rule also handles HTTP status ranges and reports missing
object leaves at source locations rather than reporting only a parent at the
operation's body-schema location.
