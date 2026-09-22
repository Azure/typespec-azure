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
response-body and collection-item metadata context.

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

Exact status codes take precedence over ranges containing the same code.
Without a comparison resource, only layout validation is skipped; immutable and
partial-update safety checks still run.

The rule traverses single HTTP document bodies, object properties, inherited
properties, nullable single-model unions, and array elements. `never` is omitted.
Records retain named-property checks, but record indexer values, tuples, and
multi-model unions are not expanded. Multipart transport wrappers, native File
models and primitive binary bodies are not PATCH document-property models.
An array-versus-scalar mismatch alone is not a type-equality diagnostic.

Recursive active-context tracking terminates cycles without suppressing sibling
uses of a shared model or different resource counterparts. Diagnostics contain
JSON paths and target authored project properties; imported declarations are
retargeted to the nearest local use or the operation.

## Correct example

Prefer standard ARM update templates such as `ArmCustomPatchSync` when defining
resource operations. A partial custom payload can omit resource properties:

```tsp
import "@typespec/http";
import "@typespec/rest";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Rest;
using Azure.ResourceManager;

@service
@armProviderNamespace
namespace Contoso.Widgets;

model WidgetProperties {
  displayName: string;
  description?: string;
}

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @path
  name: string;
}

model WidgetPatchProperties {
  displayName?: string;
  description?: string;
}

model WidgetPatch {
  tags?: Record<string>;
  properties?: WidgetPatchProperties;
}

@armResourceOperations
interface Widgets {
  update is ArmCustomPatchSync<Widget, WidgetPatch>;
}
```

In contrast, a custom payload with `displayName: string`, a default-valued
`description`, a writable envelope `location`, or an extra property absent from
the resource produces the corresponding diagnostic. Move incorrectly nested
properties to their resource JSON location rather than changing only their
authored TypeSpec name.

## Incorrect example

Using this payload instead of `WidgetPatch` in the `ArmCustomPatchSync` operation
above exposes an immutable field, requires partial-update input, introduces
properties absent from the resource, and supplies a default:

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

## Applicability and related rules

Enable this rule for compilations that should follow ARM PATCH guidance. It
checks project PATCH operations in ordinary and nested namespaces, including
interfaces, without requiring `@armProviderNamespace`. Imported library
operations and uninstantiated templates are excluded. It does not distinguish
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
