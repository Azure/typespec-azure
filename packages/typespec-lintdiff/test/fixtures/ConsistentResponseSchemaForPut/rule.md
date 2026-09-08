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

## Semantic coverage notes

- The local `tsp-lintdiff-local-linter/consistent-response-schema-for-put` rule now
  mirrors the validator's exact ARM scope: PUT only, exact `200`/`201` pairing only,
  and no diagnostics when one of those statuses is absent.
- `@azure-tools/typespec-azure-core/response-schema-problem` has only partial,
  broader overlap. It checks every non-error response body for every verb and
  status pairing, so it also fires on POST `200`/`201` and PUT `200`/`202`.

## Emission matrix

| Authored TypeSpec shape                                                          | AutoRest branch / emitted `schema`                                                   | Swagger result                                                  | TypeSpec result                                               | Fixture                            |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------- |
| Same named or inherited model                                                    | `getSchemaOrRef`; same local `$ref`                                                  | clean                                                           | clean                                                         | `same-put-responses`               |
| Different named or inherited models                                              | `getSchemaOrRef`; different local `$ref` values                                      | violation                                                       | violation                                                     | `different-put-responses`          |
| Same external/common type                                                        | `resolveExternalRef`; same external `$ref`                                           | false positive because resolved objects have different identity | clean                                                         | `same-external-reference-body`     |
| Same primitive, literal, array, or `unknown` type                                | `getSchemaOrRef`; equal inline schema objects                                        | false positive because inline objects have different identity   | clean because both responses reference the same TypeSpec type | `same-inline-response-bodies`      |
| Separately authored plain anonymous models with the same properties              | `getSchemaOrRef`; equal inline object schemas                                        | false positive because inline objects have different identity   | clean after conservative undecorated-model comparison         | `same-inline-response-bodies`      |
| Anonymous models with different defaults                                         | `getSchemaOrRef`; different property defaults                                        | violation                                                       | violation; defaults disable structural equivalence            | `different-inline-response-bodies` |
| Same named scalar, enum, or union                                                | `getSchemaOrRef`; same definition `$ref`                                             | clean                                                           | clean                                                         | `same-inline-response-bodies`      |
| Different inline primitive or anonymous-model bodies, including emitter metadata | `getSchemaOrRef`; different inline schemas                                           | violation                                                       | violation                                                     | `different-inline-response-bodies` |
| Same `bytes` type with binary versus JSON content types                          | `getSchemaForResponseBody`; file schema versus byte-string schema                    | violation                                                       | violation                                                     | `different-inline-response-bodies` |
| Same `bytes` type with mixed content variants versus binary-only                 | `emitResponseObject` aggregates content types; byte-string schema versus file schema | violation                                                       | violation                                                     | `different-inline-response-bodies` |
| Same binary/file body                                                            | `getSchemaForResponseBody`; `{ "type": "file" }`                                     | false positive because objects have different identity          | clean                                                         | `same-special-response-bodies`     |
| Multipart bodies with different source models                                    | `getSchemaForResponseBody`; always `{ "type": "string" }`                            | false positive because objects have different identity          | clean by response body kind                                   | `same-special-response-bodies`     |
| Tuples with different element types                                              | `getSchemaOrRef`; always `{ "type": "array", "items": {} }`                          | false positive because objects have different identity          | clean by emitter branch                                       | `same-special-response-bodies`     |
| Multipart versus ordinary `string`                                               | both emit `{ "type": "string" }`                                                     | false positive because objects have different identity          | clean by normalized emitted category                          | `same-special-response-bodies`     |
| Built-in `string` versus a custom scalar named `string`                          | inline string schema versus custom scalar definition `$ref`                          | violation                                                       | violation; built-ins use `checker.isStdType`                  | `different-inline-response-bodies` |
| Tuple versus `unknown[]`                                                         | both emit `{ "type": "array", "items": {} }`                                         | false positive because objects have different identity          | clean by normalized emitted category                          | `same-special-response-bodies`     |
| Tuple versus constrained or named `unknown[]`                                    | inline array schema differs or becomes a definition `$ref`                           | violation                                                       | violation; only undecorated inline arrays normalize           | `different-inline-response-bodies` |
| One exact status has no body                                                     | `emitResponseObject`; no `schema` on that response                                   | clean                                                           | clean                                                         | `missing-response-body`            |
| One exact status is absent                                                       | no response object for that status                                                   | clean                                                           | clean                                                         | `put-only-201-response`            |
| Same body exposed through multiple content variants                              | `emitResponseObject`; variants merge to one schema when body types agree             | clean                                                           | clean                                                         | `same-multiple-content-types`      |
| PUT has `200` and a non-`201` success response                                   | validator never looks up the other status                                            | clean                                                           | clean                                                         | `put-200-202-different-schemas`    |
| Non-PUT has different `200`/`201` bodies                                         | validator never reads the operation                                                  | clean                                                           | clean                                                         | `post-200-201-different-schemas`   |

Different body types within content variants trigger AutoRest's
`duplicate-body-types` diagnostic, so they are not a clean authorable branch for
this rule.

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
