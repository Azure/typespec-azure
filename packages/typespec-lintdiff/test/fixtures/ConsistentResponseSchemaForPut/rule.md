---
validatorRuleId: ConsistentResponseSchemaForPut
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/consistent-response-schema-for-put
coverageKind: lint
officialTspLints: []
tspRuleset: resource-manager
---

# ConsistentResponseSchemaForPut

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

PUT operations must return the same schema for both `200` and `201` responses.
Returning different schemas for initial create and later replace success responses is
not allowed.

## Source-of-truth notes

- Upstream `azure-openapi-validator` registers this rule in the ARM Spectral ruleset
  as `stagingOnly: true`, with severity `error`, selector `$.paths.*`, resolved
  documents, and a function that only inspects `pathItem.put`.
- The implementation reports only when both `responses["201"].schema` and
  `responses["200"].schema` exist and are different. If either status code is
  missing, the validator stays silent.
- The implementation compares resolved schema objects with JavaScript identity.
  That produces false positives for separately resolved external references and
  every equal inline schema. The TypeSpec rule intentionally compares equal inline
  types structurally and does not reproduce those validator defects.
- The upstream unit tests cover the two core cells explicitly: differing `200`/`201`
  schemas fail, and matching `200`/`201` schemas pass.
- Null or non-object Swagger path items are ignored upstream; these are not
  authorable through the TypeSpec HTTP emitter.

## Semantic coverage notes

- The local `tsp-lintdiff-local-linter/consistent-response-schema-for-put` rule now
  mirrors the validator's exact ARM scope: PUT only, exact `200`/`201` pairing only,
  and no diagnostics when one of those statuses is absent.
- Only concrete operations are checked. Operation templates and operations owned
  by template interfaces are filtered with `isTemplateDeclarationOrInstance`,
  including instantiated sources reached through `sourceOperation`. Concrete
  aliases and inherited operations on concrete interfaces remain checked.
- A status with multiple distinct native body types is excluded from comparison
  because it has no single response body type to compare with the other status.
  This boundary is defined without relying on whether an emitter accepts or rejects
  the operation. Shared body identities and bodyless variants remain comparable.
- Native equality requires the same HTTP payload body kind and the same TypeSpec
  type identity. Separately authored plain anonymous models and tuples are compared
  recursively by their undecorated native shapes. No response type is classified
  through predicted OpenAPI output, content types, compiler decorator syntax, or
  emitter schema categories.
- `@azure-tools/typespec-azure-core/response-schema-problem` has only partial,
  broader overlap. It checks every non-error response body for every verb and
  status pairing, so it also fires on POST `200`/`201` and PUT `200`/`202`.

## Emission matrix

| Authored TypeSpec shape                                                                     | AutoRest branch / emitted `schema`                                                      | Swagger result                                                  | TypeSpec result                                                 | Fixture                                             |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------- |
| Same named or inherited model                                                               | `getSchemaOrRef`; same local `$ref`                                                     | clean                                                           | clean                                                           | `same-put-responses`                                |
| Different named or inherited models                                                         | `getSchemaOrRef`; different local `$ref` values                                         | violation                                                       | violation                                                       | `different-put-responses`                           |
| Same external/common type                                                                   | `resolveExternalRef`; same external `$ref`                                              | false positive because resolved objects have different identity | clean                                                           | `same-external-reference-body`                      |
| Same primitive, literal, array, or `unknown` type                                           | `getSchemaOrRef`; equal inline schema objects                                           | false positive because inline objects have different identity   | clean because both responses reference the same TypeSpec type   | `same-inline-response-bodies`                       |
| Separately authored plain anonymous models with the same properties                         | `getSchemaOrRef`; equal inline object schemas                                           | false positive because inline objects have different identity   | clean after conservative undecorated-model comparison           | `same-inline-response-bodies`                       |
| Anonymous models with different defaults                                                    | `getSchemaOrRef`; different property defaults                                           | violation                                                       | violation; defaults disable structural equivalence              | `different-inline-response-bodies`                  |
| Same named scalar, enum, or union                                                           | `getSchemaOrRef`; same definition `$ref`                                                | clean                                                           | clean                                                           | `same-inline-response-bodies`                       |
| Different inline primitive or anonymous-model bodies, including emitter metadata            | `getSchemaOrRef`; different inline schemas                                              | violation                                                       | violation                                                       | `different-inline-response-bodies`                  |
| Same `bytes` type with binary versus JSON content types                                     | `getSchemaForResponseBody`; file schema versus byte-string schema                       | violation                                                       | clean because content type does not change native body identity | `same-special-response-bodies`                      |
| Same `bytes` type with mixed content variants versus binary-only                            | `emitResponseObject` aggregates content types; byte-string schema versus file schema    | violation                                                       | clean because content type does not change native body identity | `response content variants` native regression tests |
| Same binary/file body                                                                       | `getSchemaForResponseBody`; `{ "type": "file" }`                                        | false positive because objects have different identity          | clean                                                           | `same-special-response-bodies`                      |
| Multipart bodies with different source models                                               | `getSchemaForResponseBody`; always `{ "type": "string" }`                               | false positive because objects have different identity          | violation because native multipart model identities differ      | `different-native-response-bodies`                  |
| Separately authored tuples with the same element types                                      | `getSchemaOrRef`; always `{ "type": "array", "items": {} }`                             | false positive because objects have different identity          | clean after recursive native tuple comparison                   | `native response type equality` tests               |
| Tuples with different element types                                                         | `getSchemaOrRef`; always `{ "type": "array", "items": {} }`                             | false positive because objects have different identity          | violation because native tuple element types differ             | `different-native-response-bodies`                  |
| Multipart versus ordinary `string`                                                          | both emit `{ "type": "string" }`                                                        | false positive because objects have different identity          | violation because HTTP payload body kinds differ                | `different-native-response-bodies`                  |
| Built-in `string` versus a custom scalar named `string`                                     | inline string schema versus custom scalar definition `$ref`                             | violation                                                       | violation because the native type identities differ             | `different-inline-response-bodies`                  |
| Tuple versus `unknown[]`                                                                    | both emit `{ "type": "array", "items": {} }`                                            | false positive because objects have different identity          | violation because tuple and array are distinct native kinds     | `different-native-response-bodies`                  |
| Tuple versus constrained or named `unknown[]`                                               | inline array schema differs or becomes a definition `$ref`                              | violation                                                       | violation because tuple and array remain distinct native kinds  | `different-inline-response-bodies`                  |
| One exact status has no body                                                                | `emitResponseObject`; no `schema` on that response                                      | clean                                                           | clean                                                           | `missing-response-body`                             |
| One exact status is absent                                                                  | no response object for that status                                                      | clean                                                           | clean                                                           | `put-only-201-response`                             |
| Same body exposed through multiple content variants                                         | `emitResponseObject`; variants merge to one schema when body types agree                | clean                                                           | clean                                                           | `same-multiple-content-types`                       |
| Shared body within each status, but different native types across statuses; reversed orders | `emitResponseObject`; shared bodies produce stable schemas regardless of variant order  | violation                                                       | violation in either order based on native body identity         | `different-multiple-content-types`                  |
| Different body types or body kinds within either exact status                               | no single native body contract exists for that status                                   | validator behavior depends on emitted output                    | skip the ambiguous group regardless of order                    | `response content variants` native regression tests |
| Bodyless and body-bearing variants share a status                                           | `emitResponseObject`; bodyless variant adds no schema; body-bearing variant supplies it | depends on the other status's schema                            | compare the available body in either order                      | `response content variants` native regression tests |
| PUT has `200` and a non-`201` success response                                              | validator never looks up the other status                                               | clean                                                           | clean                                                           | `put-200-202-different-schemas`                     |
| Non-PUT has different `200`/`201` bodies                                                    | validator never reads the operation                                                     | clean                                                           | clean                                                           | `post-200-201-different-schemas`                    |

Different body types or body kinds within one status are TypeSpec-authorable, but
they do not define one native body contract for this rule to compare. The rule
does not choose an order-dependent variant, canonicalize the alternatives, or
invent a union schema. Emitter behavior is comparison evidence, not the
production decision.

The twenty-six tests in `test/rules/consistent-response-schema-for-put.test.ts`
add exact diagnostic-count and target assertions for operation aliases, concrete
interface aliases, inherited interface operations, and instantiated interface
sources; native tuple equality and inequality; multipart/body-kind distinctions;
content-type-independent byte identity; conflicting response variants at either
status; reordered valid groups; and bodyless variants. See
[migration.md](./migration.md) for current repair and corpus evidence.

## Test Cases

| ID                                 | Violation | Description                                                                                                                                      |
| ---------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `different-put-responses`          | true      | ARM PUT returns different `200` and `201` resource schemas                                                                                       |
| `same-put-responses`               | false     | ARM PUT returns the same schema for both `200` and `201` responses                                                                               |
| `put-200-202-different-schemas`    | false     | ARM PUT returns different `200` and `202` schemas; the validator ignores `202`                                                                   |
| `put-only-201-response`            | false     | ARM PUT returns only a `201` schema; the validator does not require a matching `200`                                                             |
| `post-200-201-different-schemas`   | false     | ARM POST returns different `200` and `201` schemas; the validator is PUT-only                                                                    |
| `different-inline-response-bodies` | true      | ARM PUT returns different inline primitive, encoded anonymous-model, constrained-array, and custom-scalar schemas                                |
| `different-native-response-bodies` | true      | ARM PUT returns different native multipart, tuple, body-kind, and tuple-versus-array body types                                                  |
| `same-inline-response-bodies`      | false     | Equal inline primitives/containers and named scalar/enum/union families stay compliant; reviewed validator identity false positives are recorded |
| `same-special-response-bodies`     | false     | Identical native `bytes` bodies stay compliant regardless of content-type-driven emitted file/string differences                                 |
| `same-external-reference-body`     | false     | Equal external common-type references stay compliant; the validator's resolved-reference false positive is recorded                              |
| `missing-response-body`            | false     | Either exact status may omit its response body                                                                                                   |
| `same-multiple-content-types`      | false     | Multiple content variants with one shared body schema remain compliant                                                                           |
| `different-multiple-content-types` | true      | Reordered valid content variants preserve named-schema differences and aggregate JSON/binary content types at status 201                         |
