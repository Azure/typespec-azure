Checks the effective input of ARM PATCH operations in one traversal. A PATCH
document may omit resource properties, but must not:

- Introduce a JSON property missing from the resource at the same nesting level.
- Expose immutable `id`, `name`, `type`, `location`, or
  `properties.provisioningState` as PATCH input.
- Require an input property outside array elements.
- Give an input property a default, including `false`, `0`, or `""`.
- Expose an input property whose lifecycle visibility does not include Update.

These are property-layout and partial-update checks, not whole-model
assignability. Value types and constraints need not be equal.

## Effective input and exceptions

HTTP request visibility is resolved independently for each operation. Shared
Read-only/Create-only resource properties excluded from ordinary PATCH are not
checked, nor are their defaults or descendants. Explicit `@parameterVisibility`
overrides may expose such properties; exposed properties must include
`Lifecycle.Update`. Marking an immutable field Update-visible does not make it
patchable. Standard Read + Create `location` remains valid for ordinary PATCH.
Authored optionality and legacy implicit PATCH optionality are respected.
HTTP metadata inside an explicit `@body` remains JSON input even when an HTTP
annotation is ignored; `@bodyRoot` transport properties stay outside the document.
Resource comparison excludes transport-only properties and retains explicit
response-body and collection-item metadata context. Response-derived resource
members may be readable or writable for the PATCH operation; write-only members
are not rejected merely because they are absent from Read output.

The case-insensitive, encoded top-level `identity` property and its descendants
are exempt from optionality, default, and lifecycle-visibility checks.
**Resource-layout validation still applies to identity.** Nested properties
named `identity` have no special exemption.

Array updates supply replacement elements: required element properties and their
descendants are permitted. Defaults, visibility, and corresponding array-element
resource layouts remain checked. HTTP collection-item metadata is used.
Array item `id` or `name` properties are not resource-envelope immutable paths.

Only authored discriminator properties participate. Missing discriminator
properties are not synthesized; optional discriminators are not forced
required. Inheritance, overrides and encoded JSON names are respected, and
compiler discriminator validation remains separate.

## Resource selection and supported shapes

An explicit native resource-operation association takes precedence, including
asynchronous PATCH operations. Otherwise comparison uses, in order:

1. PATCH 200 response body.
2. PATCH 201 response body.
3. Same-service, same-path GET 200 response body.
4. Same-service, same-path GET 201 response body.

Without service metadata, GET fallback stays within the PATCH operation's
namespace. A GET from an unrelated namespace or service is not a comparison
resource.

Exact status codes take precedence over ranges containing the same code.
Singleton ranges are exact status codes. Content variants with different body
types, body kinds, or explicit-body metadata are ambiguous and are not used as
comparison resources; identical body variants may be used.
Across equally preferred status entries or shared-route GET operations, layout
errors must hold for every comparison candidate. A property absent from every
candidate is still reported; declaration order does not select an arbitrary
resource. Partial-update safety checks remain independent of these alternatives.
Without a comparison resource, only layout validation is skipped; immutable and
partial-update safety checks still run.

The rule traverses single HTTP document bodies, object properties, inherited
properties, nullable single-model unions, and array elements. `never` is omitted.
Resource records permit arbitrary string keys while retaining layout checks on
their declared named members. Record indexer values, tuples, and multi-model
unions are not expanded. When a present resource counterpart is an
unsupported union, only descendant layout comparison is skipped; required,
default, visibility, and immutable checks still run. Genuinely absent properties
and supported single-model or nullable counterparts retain layout comparison.
Multipart transport wrappers, native File models and primitive binary bodies
are not PATCH document-property models. Inherited native File members are also
excluded in derived files, but authored JSON property overrides retain their
partial-update checks.
An array-versus-scalar mismatch alone is not a type-equality diagnostic.

Recursive active-context tracking terminates cycles without suppressing sibling
uses of a shared model or different resource counterparts. Diagnostics contain
JSON paths and target authored project properties; imported declarations are
reported at the nearest local use or the operation.

## Incorrect example

Assume a tracked `Widget` resource whose `properties` contains `displayName` and
`description`, but not `extra` or `enabled`. These excerpts show only the custom
PATCH payload; imports, resource declarations, and operations are omitted.

This payload exposes immutable `location`, requires `properties` and
`displayName`, introduces absent fields, and supplies a default:

```tsp
model UnsafeWidgetPatch {
  location?: string;
  properties: {
    displayName: string;
    extra?: string;
    enabled?: boolean = false;
  };
}
```

## Correct example

Remove immutable and extra fields, make input optional, and omit defaults:

```tsp
model WidgetPatch {
  tags?: Record<string>;
  properties?: {
    displayName?: string;
    description?: string;
  };
}
```

Use the fixed payload with a standard ARM update template such as
`ArmCustomPatchSync<Widget, PatchModel = WidgetPatch>`. Resource properties may
be omitted. Move incorrectly nested properties to their resource JSON location
rather than changing only their authored TypeSpec name.

## Applicability and related rules

Enable this rule for compilations that should follow ARM PATCH guidance. It
checks project PATCH operations in ordinary and nested namespaces, including
interfaces, without requiring `@armProviderNamespace`. Imported library
operations and non-endpoint template declarations/instances are excluded.
Concrete operations defined using templates remain checked. It does not distinguish
ARM and data-plane services within the same compilation.

The shared `@azure-tools/typespec-azure-rulesets/resource-manager` ruleset leaves
this rule **disabled**. Enable
`@azure-tools/typespec-azure-resource-manager/no-unsafe-patch-body-properties`
explicitly to use it; no default enablement changes are introduced.

`arm-resource-patch` remains responsible for body shape, tags, and its existing
resource-subset checks. Enabling both can report overlapping top-level subset
warnings with different diagnostic IDs and locations. Neither is silently
suppressed or removed. `patch-envelope` separately requires supported envelope
properties to be present, whereas this rule permits resource-property omissions.
PATCH-to-PUT correspondence remains separate: PUT input is not necessarily the
resource representation.

## LintDiff Equivalent

| Displayed diagnostic                                                                                                      | Legacy rule                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `The property '<path>' in the request body either does not appear in the resource model or is nested at the wrong level.` | [ConsistentPatchProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/consistent-patch-properties.md)                                                                                   |
| `PATCH request body property '<path>' is immutable and must be excluded from PATCH input.`                                | [UnSupportedPatchProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/un-supported-patch-properties.md)                                                                                |
| `Properties of a PATCH request body must not be required, property:<path>.`                                               | [PatchBodyParametersSchema](https://github.com/Azure/azure-openapi-validator/blob/main/docs/patch-body-parameters-schema.md)                                                                                  |
| `Properties of a PATCH request body must not have default value, property:<path>.`                                        | [PatchBodyParametersSchema](https://github.com/Azure/azure-openapi-validator/blob/main/docs/patch-body-parameters-schema.md)                                                                                  |
| `PATCH request body property '<path>' must include Lifecycle.Update visibility.`                                          | [PatchBodyParametersSchema](https://github.com/Azure/azure-openapi-validator/blob/main/docs/patch-body-parameters-schema.md), generalized from create-only to any exposed non-Update input (native extension) |

Array-element checks and the required-element exception are a native extension,
not historical Swagger coverage. Other deliberate differences include effective
request visibility rather than emitted-schema reuse, authored-only discriminators,
all falsy defaults, explicit resource association, native status ranges, inherited
`never` overrides, and no emitter/client-generator scope filtering.
Validator diagnostics remain evidence; exact Swagger equivalence is not claimed.

## Impact

- **Area:** API

Unsafe PATCH shapes can make partial updates ambiguous, expose immutable state,
or make generated clients require fields that should be optional.

## Suppression

Suppress only for a documented existing contract that cannot be corrected
compatibly. A suppression disables all categories for the targeted declaration;
prefer fixing the specific property, visibility, default or nesting instead.
