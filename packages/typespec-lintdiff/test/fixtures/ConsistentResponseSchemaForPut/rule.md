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
- A status with multiple distinct body types is excluded from comparison. AutoRest
  rejects that shape with `duplicate-body-types`; selecting its last body would
  add an order-dependent secondary warning. Shared body types still aggregate all
  content types, and bodyless variants do not invalidate a body's schema.
- Ordinary `unknown[]` is normalized with tuple schemas even though it has the
  compiler's intrinsic indexer decorator. Only the genuine intrinsic function,
  obtained from the standard `Array` declaration, is ignored; constraints, custom
  decorators, and named or friendly-named arrays retain their existing checks.
- `@azure-tools/typespec-azure-core/response-schema-problem` has only partial,
  broader overlap. It checks every non-error response body for every verb and
  status pairing, so it also fires on POST `200`/`201` and PUT `200`/`202`.

## Emission matrix

| Authored TypeSpec shape                                                                        | AutoRest branch / emitted `schema`                                                                          | Swagger result                                                  | TypeSpec result                                                          | Fixture                                             |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------- |
| Same named or inherited model                                                                  | `getSchemaOrRef`; same local `$ref`                                                                         | clean                                                           | clean                                                                    | `same-put-responses`                                |
| Different named or inherited models                                                            | `getSchemaOrRef`; different local `$ref` values                                                             | violation                                                       | violation                                                                | `different-put-responses`                           |
| Same external/common type                                                                      | `resolveExternalRef`; same external `$ref`                                                                  | false positive because resolved objects have different identity | clean                                                                    | `same-external-reference-body`                      |
| Same primitive, literal, array, or `unknown` type                                              | `getSchemaOrRef`; equal inline schema objects                                                               | false positive because inline objects have different identity   | clean because both responses reference the same TypeSpec type            | `same-inline-response-bodies`                       |
| Separately authored plain anonymous models with the same properties                            | `getSchemaOrRef`; equal inline object schemas                                                               | false positive because inline objects have different identity   | clean after conservative undecorated-model comparison                    | `same-inline-response-bodies`                       |
| Anonymous models with different defaults                                                       | `getSchemaOrRef`; different property defaults                                                               | violation                                                       | violation; defaults disable structural equivalence                       | `different-inline-response-bodies`                  |
| Same named scalar, enum, or union                                                              | `getSchemaOrRef`; same definition `$ref`                                                                    | clean                                                           | clean                                                                    | `same-inline-response-bodies`                       |
| Different inline primitive or anonymous-model bodies, including emitter metadata               | `getSchemaOrRef`; different inline schemas                                                                  | violation                                                       | violation                                                                | `different-inline-response-bodies`                  |
| Same `bytes` type with binary versus JSON content types                                        | `getSchemaForResponseBody`; file schema versus byte-string schema                                           | violation                                                       | violation                                                                | `different-inline-response-bodies`                  |
| Same `bytes` type with mixed content variants versus binary-only                               | `emitResponseObject` aggregates content types; byte-string schema versus file schema                        | violation                                                       | violation                                                                | `different-inline-response-bodies`                  |
| Same binary/file body                                                                          | `getSchemaForResponseBody`; `{ "type": "file" }`                                                            | false positive because objects have different identity          | clean                                                                    | `same-special-response-bodies`                      |
| Multipart bodies with different source models                                                  | `getSchemaForResponseBody`; always `{ "type": "string" }`                                                   | false positive because objects have different identity          | clean by response body kind                                              | `same-special-response-bodies`                      |
| Tuples with different element types                                                            | `getSchemaOrRef`; always `{ "type": "array", "items": {} }`                                                 | false positive because objects have different identity          | clean by emitter branch                                                  | `same-special-response-bodies`                      |
| Multipart versus ordinary `string`                                                             | both emit `{ "type": "string" }`                                                                            | false positive because objects have different identity          | clean by normalized emitted category                                     | `same-special-response-bodies`                      |
| Built-in `string` versus a custom scalar named `string`                                        | inline string schema versus custom scalar definition `$ref`                                                 | violation                                                       | violation; built-ins use `checker.isStdType`                             | `different-inline-response-bodies`                  |
| Tuple versus `unknown[]`                                                                       | both emit `{ "type": "array", "items": {} }`                                                                | false positive because objects have different identity          | clean by normalized emitted category                                     | `same-special-response-bodies`                      |
| Tuple versus constrained or named `unknown[]`                                                  | inline array schema differs or becomes a definition `$ref`                                                  | violation                                                       | violation; only inline arrays with no non-intrinsic decorators normalize | `different-inline-response-bodies`                  |
| One exact status has no body                                                                   | `emitResponseObject`; no `schema` on that response                                                          | clean                                                           | clean                                                                    | `missing-response-body`                             |
| One exact status is absent                                                                     | no response object for that status                                                                          | clean                                                           | clean                                                                    | `put-only-201-response`                             |
| Same body exposed through multiple content variants                                            | `emitResponseObject`; variants merge to one schema when body types agree                                    | clean                                                           | clean                                                                    | `same-multiple-content-types`                       |
| Shared body within each status, but different schemas across statuses; reversed variant orders | `emitResponseObject`; shared body and aggregated content types produce different named or byte/file schemas | violation                                                       | violation in either order                                                | `different-multiple-content-types`                  |
| Different body types within either exact status, including distinct equal anonymous types      | `emitResponseObject`; `duplicate-body-types` error before successful Swagger emission                       | no valid Swagger comparison                                     | skip the invalid group regardless of order                               | `response content variants` native regression tests |
| Bodyless and body-bearing variants share a status                                              | `emitResponseObject`; bodyless variant adds no schema; body-bearing variant supplies it                     | depends on the other status's schema                            | compare the available body in either order                               | `response content variants` native regression tests |
| PUT has `200` and a non-`201` success response                                                 | validator never looks up the other status                                                                   | clean                                                           | clean                                                                    | `put-200-202-different-schemas`                     |
| Non-PUT has different `200`/`201` bodies                                                       | validator never reads the operation                                                                         | clean                                                           | clean                                                                    | `post-200-201-different-schemas`                    |

Different body types within content variants are TypeSpec-authorable, but AutoRest
rejects them with `duplicate-body-types`. The native regression tests assert that
emitter error rather than treating an invalid fixture as a successful Swagger
comparison. The rule does not canonicalize the conflicting bodies or invent a
union schema. This is a deliberate invalid-input exemption, not a change to
schema equality for successfully emitted responses.

The twenty-six tests in `test/rules/consistent-response-schema-for-put.test.ts`
add exact diagnostic-count and target assertions for operation aliases, concrete
interface aliases, inherited interface operations, and instantiated interface
sources; tuple/unknown-array equivalence in both response directions; and
named, friendly-named, constrained, custom-decorated, and typed-array controls;
conflicting response variants at either status; reordered valid groups; and
bodyless variants. See [migration.md](./migration.md) for current repair and corpus
evidence.

## Test Cases

| ID                                 | Violation | Description                                                                                                                                                   |
| ---------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `different-put-responses`          | true      | ARM PUT returns different `200` and `201` resource schemas                                                                                                    |
| `same-put-responses`               | false     | ARM PUT returns the same schema for both `200` and `201` responses                                                                                            |
| `put-200-202-different-schemas`    | false     | ARM PUT returns different `200` and `202` schemas; the validator ignores `202`                                                                                |
| `put-only-201-response`            | false     | ARM PUT returns only a `201` schema; the validator does not require a matching `200`                                                                          |
| `post-200-201-different-schemas`   | false     | ARM POST returns different `200` and `201` schemas; the validator is PUT-only                                                                                 |
| `different-inline-response-bodies` | true      | ARM PUT returns different inline primitive, encoded anonymous-model, and content-type-dependent bytes schemas                                                 |
| `same-inline-response-bodies`      | false     | Equal inline primitives/containers and named scalar/enum/union families stay compliant; reviewed validator identity false positives are recorded              |
| `same-special-response-bodies`     | false     | Binary, differing multipart source models, and differing tuple source types emit equivalent schemas; reviewed validator identity false positives are recorded |
| `same-external-reference-body`     | false     | Equal external common-type references stay compliant; the validator's resolved-reference false positive is recorded                                           |
| `missing-response-body`            | false     | Either exact status may omit its response body                                                                                                                |
| `same-multiple-content-types`      | false     | Multiple content variants with one shared body schema remain compliant                                                                                        |
| `different-multiple-content-types` | true      | Reordered valid content variants preserve named-schema differences and aggregate JSON/binary content types at status 201                                      |
