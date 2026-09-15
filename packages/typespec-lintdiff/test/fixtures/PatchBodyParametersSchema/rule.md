---
validatorRuleId: PatchBodyParametersSchema
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/patch-body-parameters-schema
coverageKind: partial
projectionScope: http-reachable
---

# PatchBodyParametersSchema

**Severity:** error

**Applies to:** Resource Manager (ARM)

PATCH body parameters must not have required properties, defaults, or create-only members.

The local lint `tsp-lintdiff-local-linter/patch-body-parameters-schema` walks ARM PATCH request
body models recursively and flags the authorable TypeSpec sad paths enforced by the Swagger rule:

- required properties
- default-valued properties
- properties emitted with `x-ms-mutability: ["create"]`

The Swagger rule skips a top-level PATCH body property named `identity` before checking that
property or its children. The local lint mirrors that exception to avoid false positives on
identity envelopes.

The local lint uses TypeSpec HTTP metadata to mirror Autorest's effective PATCH schema. Properties
omitted by request visibility or typed as `never` are not checked. Requiredness follows emitted
PATCH optionality, including discriminator properties that Autorest forces or synthesizes as
required.

The property checks apply only to HTTP `single` bodies. Multipart wrappers and file models
describe transport payloads, not PATCH document properties: multipart parts become `formData`
parameters and file bodies become primitive binary schemas. The rule uses the native HTTP
`bodyKind` metadata to exclude these payloads; it does not call an emitter. Single binary
payloads naturally have no model properties to inspect.

This exclusion does not approve non-JSON ARM operations. The comparison fixtures retain the
independent ARM content-type and other ambient warnings. Native rule tests import no emitter
and confirm that these are valid HTTP payloads, that the property rule stays silent on them,
and that ordinary and nullable single models retain required, default, and create-only checks.

## Payload-kind evidence

| Authored shape                                 | HTTP support and body kind                                 | Emitted PATCH parameter                                                | Swagger / TypeSpec property-rule result | Evidence                                                            |
| ---------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| Model with required/default/create-only fields | Valid `single`                                             | `in: body`, object schema                                              | Violations / violations                 | Existing violating fixtures; native single-model test               |
| Nullable model with those fields               | Valid `single`                                             | `in: body`, nullable object schema                                     | Violations / violations                 | `nullable-body-required-property`; native nullable-model test       |
| Required string and bytes multipart parts      | Valid HTTP `multipart`; ARM non-JSON guidance warns        | Required `in: formData` string/file parameters, no wrapper body schema | None / none                             | `multipart-patch-body-compliant`; native multipart-model test       |
| Tuple of named multipart parts                 | Valid HTTP `multipart`; not an ARM JSON document           | Individual `formData` parameters                                       | No body schema selected / none          | Native multipart-tuple test; AutoRest `emitMultipartBodyParameters` |
| `@bodyRoot body: File`                         | Valid HTTP `file`; ARM non-JSON/object-body guidance warns | `in: body`, `{ type: "string", format: "binary" }`                     | None / none                             | `file-patch-body-compliant`; native file test                       |
| `bytes` with octet-stream content type         | Valid HTTP `single`; not an ARM JSON document              | Primitive binary body schema                                           | No model properties / none              | Native single-binary test; AutoRest `emitSingleBodyParameters`      |

## Test Cases

| ID                                             | Violation | Description                                                                 |
| ---------------------------------------------- | --------- | --------------------------------------------------------------------------- |
| `required-patch-property`                      | true      | PATCH body contains required property                                       |
| `nullable-body-required-property`              | true      | Nullable top-level PATCH body contains a required property                  |
| `nullable-model-required-property`             | true      | Nullable PATCH model contains a required nested property                    |
| `discriminator-required-patch-property`        | true      | Autorest forces direct and inherited discriminators required                |
| `default-patch-property`                       | true      | PATCH body contains truthy and falsy default-valued properties              |
| `create-only-patch-property`                   | true      | PATCH body contains a property emitted as create-only mutable               |
| `implicit-optional-patch-compliant`            | false     | PATCH transforms optionalize or omit source properties                      |
| `multi-model-union-compliant`                  | false     | Unsupported multi-model unions emit no PATCH schema properties              |
| `never-property-compliant`                     | false     | Autorest omits a required property whose type is `never`                    |
| `top-level-identity-compliant`                 | false     | PATCH body top-level `identity` is skipped like the Swagger rule            |
| `synthesized-identity-discriminator-compliant` | false     | Synthesized top-level `identity` discriminator is skipped like Swagger rule |
| `encoded-identity-compliant`                   | false     | PATCH body property encoded as top-level `identity` is skipped              |
| `encoded-non-identity-violating`               | true      | Authored `identity` encoded away from `identity` is checked                 |
| `multipart-patch-body-compliant`               | false     | Required multipart fields are formData parameters, not body properties      |
| `file-patch-body-compliant`                    | false     | File payload emits a primitive binary schema without model properties       |
