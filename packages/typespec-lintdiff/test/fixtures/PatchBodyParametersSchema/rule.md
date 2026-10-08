---
validatorRuleId: PatchBodyParametersSchema
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/no-unsafe-patch-body-properties
coverageKind: partial
projectionScope: http-reachable
---

# PatchBodyParametersSchema

**Severity:** error

**Applies to:** Resource Manager (ARM)

## Consolidated native contract

This legacy rule maps to the shared
[`no-unsafe-patch-body-properties`](../../../src/rules/no-unsafe-patch-body-properties.md)
implementation together with `ConsistentPatchProperties` and `UnSupportedPatchProperties`.
The linked contract and diagnostic mapping supersede the historical description below.
In particular, exposed non-Update input and array elements are now checked;
required array-element properties remain permitted. Identity exempts safety, not layout.
Comparison snapshots contain **all categories** of the combined diagnostic ID,
not category-filtered counts proving equivalence to this one Swagger rule.

## Historical safety-rule evidence

PATCH body parameters must not have required properties, defaults, or create-only members.

The local lint `tsp-lintdiff-local-linter/patch-body-parameters-schema` walks effective ARM
PATCH request body models recursively and checks native TypeSpec properties:

- required properties
- default-valued properties
- properties visible only during `Lifecycle.Create`, when the operation explicitly includes
  that visibility in its request input

The Swagger rule skips a top-level PATCH body property named `identity` before checking that
property or its children. The local lint mirrors that exception to avoid false positives on
identity envelopes.

The resolved operation request visibility controls both payload membership and optionality.
Ordinary PATCH uses Update visibility, so Read-only and Create-only properties receive **no**
required, default, or create-only diagnostics. An unrelated Read/Query property cannot change
that result. Explicit `@parameterVisibility` overrides are honored. Authored optional properties
and the supported legacy `@patch(#{ implicitOptionality: true })` option remain optional.

The rule does not simulate AutoRest's canonical Read schema sharing, insert absent
discriminators, or force optional discriminators to be required. An authored required
discriminator is checked like any other property, including inherited properties, only
when present in the effective input. `never` properties are ignored. Compiler-rejected
derived discriminator shapes are not additional lint branches.

This intentionally differs from emitted Swagger validation. Schema reuse can retain
Read/Create properties, and AutoRest can synthesize or force required discriminators.
The comparison fixtures preserve these validator diagnostics rather than manufacture parity.
The native rule also detects falsy defaults that the validator's truthiness check misses.

The property checks apply only to HTTP `single` bodies. Multipart wrappers and file models
describe transport payloads, not PATCH document properties: multipart parts become `formData`
parameters and file bodies become primitive binary schemas. The rule uses the native HTTP
`bodyKind` metadata to exclude these payloads; it does not call an emitter. Single binary
payloads naturally have no model properties to inspect.

This exclusion does not approve non-JSON ARM operations. The comparison fixtures retain the
independent ARM content-type and other ambient warnings. Native rule tests import no emitter
and confirm that these are valid HTTP payloads, that the property rule stays silent on them,
and that ordinary and nullable single models retain required and default checks.

## Source and applicability

- [Validator implementation](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/patch-body-parameters.ts)
- [Validator documentation](https://github.com/Azure/azure-openapi-validator/blob/main/docs/patch-body-parameters-schema.md)
- [Validator tests](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/test/patch-body-parameters.test.ts)

The validator selects PATCH body parameters, resolves inherited object properties and required
lists, checks truthy defaults and exact `["create"]` mutability, and recurses into nested objects.
It reports at the body schema or nested schema path. Its top-level case-insensitive JSON
`identity` exemption is preserved; nested identity properties are checked.

The provider guard is lintdiff-only isolation in its combined ARM/data-plane ruleset. Promotion
to the official ARM ruleset removes that guard, not the semantic checks. The official
`arm-resource-patch` rule checks body shape, resource subsets and tags, not these property
conditions. Template optionalization does not cover independently authored PATCH bodies.

## Payload-kind evidence

| Authored shape                            | HTTP support and body kind                                 | Emitted PATCH parameter                                                | Swagger / TypeSpec property-rule result | Evidence                                                            |
| ----------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| Model with required/default fields        | Valid `single`                                             | `in: body`, object schema                                              | Violations / violations                 | Existing violating fixtures; native single-model test               |
| Nullable model with those fields          | Valid `single`                                             | `in: body`, nullable object schema                                     | Violations / violations                 | `nullable-body-required-property`; native nullable-model test       |
| Required string and bytes multipart parts | Valid HTTP `multipart`; ARM non-JSON guidance warns        | Required `in: formData` string/file parameters, no wrapper body schema | None / none                             | `multipart-patch-body-compliant`; native multipart-model test       |
| Tuple of named multipart parts            | Valid HTTP `multipart`; not an ARM JSON document           | Individual `formData` parameters                                       | No body schema selected / none          | Native multipart-tuple test; AutoRest `emitMultipartBodyParameters` |
| `@bodyRoot body: File`                    | Valid HTTP `file`; ARM non-JSON/object-body guidance warns | `in: body`, `{ type: "string", format: "binary" }`                     | None / none                             | `file-patch-body-compliant`; native file test                       |
| `bytes` with octet-stream content type    | Valid HTTP `single`; not an ARM JSON document              | Primitive binary body schema                                           | No model properties / none              | Native single-binary test; AutoRest `emitSingleBodyParameters`      |

## Test Cases

| ID                                             | Violation | Description                                                                                               |
| ---------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------- |
| `required-patch-property`                      | true      | PATCH body contains required property                                                                     |
| `nullable-body-required-property`              | true      | Nullable top-level PATCH body contains a required property                                                |
| `nullable-model-required-property`             | true      | Nullable PATCH model contains a required nested property                                                  |
| `discriminator-required-patch-property`        | true      | Only the authored required derived discriminator is a native violation; two extra Swagger warnings remain |
| `default-patch-property`                       | true      | PATCH body contains truthy and falsy default-valued properties                                            |
| `create-only-patch-property`                   | false     | Native PATCH excludes the create-only property; Swagger reports it in a shared schema                     |
| `create-visibility-override`                   | true      | Explicit request visibility includes a create-only input                                                  |
| `native-visibility-compliant`                  | false     | Read/Create exclusion, unrelated Read/Query invariance, and read-only defaults                            |
| `native-discriminator-compliant`               | false     | Absent, optional, and excluded discriminators are not native required inputs                              |
| `implicit-optional-patch-compliant`            | false     | PATCH transforms optionalize or omit source properties                                                    |
| `multi-model-union-compliant`                  | false     | Unsupported multi-model unions emit no PATCH schema properties                                            |
| `never-property-compliant`                     | false     | Autorest omits a required property whose type is `never`                                                  |
| `top-level-identity-compliant`                 | false     | PATCH body top-level `identity` is skipped like the Swagger rule                                          |
| `synthesized-identity-discriminator-compliant` | false     | Synthesized top-level `identity` discriminator is skipped like Swagger rule                               |
| `encoded-identity-compliant`                   | false     | PATCH body property encoded as top-level `identity` is skipped                                            |
| `encoded-non-identity-violating`               | true      | Authored `identity` encoded away from `identity` is checked                                               |
| `multipart-patch-body-compliant`               | false     | Required multipart fields are formData parameters, not body properties                                    |
| `file-patch-body-compliant`                    | false     | File payload emits a primitive binary schema without model properties                                     |

## Native shape and emission matrix

All rows below compile without TypeSpec errors. Ambient ARM design warnings in comparison
fixtures are explicitly recorded; these fixtures do not claim complete ARM guideline compliance.
Native rule tests do not import an emitter.

| Authored shape                                                             | Native check / emission research                                        | Selected Swagger field                         | Swagger result              | Native result / evidence                                                          |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------- |
| Read-only required `id`, optional Create-only `createdBy`, optional `name` | Update input; AutoRest shared Read schema                               | `required: ["id"]`, create mutability retained | Two warnings                | None; `native-visibility-compliant`                                               |
| Same body plus optional Read/Query property                                | Same Update input; AutoRest now transforms schema                       | Only `name`; no required/default/mutability    | None                        | None; same fixture                                                                |
| Read-only `id: string = "server"`                                          | Excluded from Update; retained in shared schema                         | Required `id` and truthy default               | Two warnings                | None; same fixture                                                                |
| `@parameterVisibility(Lifecycle.Create)` with optional Create-only field   | Explicit Create input                                                   | Create mutability                              | Warning                     | Warning; `create-visibility-override`                                             |
| Root `@discriminator("kind")` with no authored `kind`                      | No native property; AutoRest inserts discriminator                      | Required string `kind`                         | Warning                     | None; `native-discriminator-compliant`                                            |
| Root optional `kind?: string` discriminator                                | Authored optional; AutoRest forces required                             | Required string `kind`                         | Warning                     | None; same fixture                                                                |
| Read-only required discriminator                                           | Excluded from Update                                                    | Required read-only `kind` in shared schema     | Warning                     | None; same fixture                                                                |
| Authored required derived literal discriminator                            | Ordinary required effective input, inherited traversal                  | Required `kind`, including `allOf`             | Warning                     | Warning; `discriminator-required-patch-property` and native inherited-target test |
| Required discriminator with legacy implicit optionality                    | HTTP makes effective input optional; emitter still forces discriminator | Required discriminator                         | Warning                     | None; native optionality regression and emitter `getSchemaForModel` evidence      |
| Falsy defaults `false`, `0`, `""`                                          | Defined defaults in effective input                                     | Falsy `default` values                         | None                        | Three warnings; `default-patch-property`                                          |
| Derived optional discriminator variant                                     | Compiler validates derived variants                                     | Not a supported valid input                    | Not used as parity evidence | `invalid-discriminator-value`; compiler discriminator-utils tests                 |
| Leaf derived model missing discriminator                                   | Compiler validates derived variants                                     | Not a supported valid input                    | Not used as parity evidence | `missing-discriminator-property`; compiler discriminator-utils                    |

Traversal remains deliberately unchanged: single models, inherited properties and one non-null
union member; no new array/indexer or multi-model-union traversal. Metadata is shared per rule
instance, while visited models and violations are fresh per operation. Diagnostics target the
authored property or nearest project-owned target for imported properties.
