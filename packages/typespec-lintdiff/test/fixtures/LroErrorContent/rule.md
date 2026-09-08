---
validatorRuleId: LroErrorContent
engine: spectral
tspLints:
  - "tsp-lintdiff-local-linter/lro-error-content"
coverageKind: lint
tspRuleset: resource-manager
---

# LroErrorContent

**Severity:** error

**Applies to:** Resource Manager (ARM)

- linter code: [LroErrorContent](https://github.com/Azure/azure-openapi-validator/blob/a970d991d2785184d2786b85e0a345dc3f37bc25/packages/rulesets/src/spectral/az-arm.ts#L233-L249)
- linter doc: [lro-error-content.md](https://github.com/Azure/azure-openapi-validator/blob/a970d991d2785184d2786b85e0a345dc3f37bc25/docs/lro-error-content.md)
- Guideline: `RPC-Common-V1-05`.

## Contract and official coverage

The non-resolving Swagger rule visits `paths` and `x-ms-paths`, selects operations
whose `x-ms-long-running-operation` is exactly `true`, and checks only existing
`schema.$ref` values of `default`, 4xx and 5xx responses. Its pattern requires
`/common-types/resource-management/v2-or-later/types.json#/definitions/ErrorResponse`.
It does not structurally validate inline schemas, require a response body, follow
references, or inspect success responses. The original regex is unanchored and
its dot in `types.json` is unescaped; this migration preserves that behavior.

Official coverage classification: **gap**. No registered rule in azure-core or
azure-resource-manager enforces this reference check. `no-error-status-codes`
checks status selection; `arm-post-operation-response-codes` checks status sets
and success bodies, not error references. The RPC inventory does not list
`RPC-Common-V1-05`. Standard templates supply `CommonTypes.ErrorResponse` by
default, but `ArmResourceCreateOrReplaceAsync` and `ArmResourceActionAsync` expose
an `Error extends {}` parameter, so custom errors require neither raw extensions
nor suppression. `template-and-versions` proves that native authoring path.

## Native implementation

The rule obtains AutoRest-scoped HTTP endpoints from each ARM service, including nested
namespaces, and inspects all declared version snapshots using versioning
mutators. Diagnostics are deduplicated by authored operation node across error
statuses and versions. Removed operations remain diagnosable in the versions
where they existed; they are not compared with latest-only Swagger occurrences.

LRO selection follows AutoRest: non-GET LRO metadata or AutoRest-scoped
`Legacy.markAsLro`, followed by the explicit OpenAPI extension override.
Response-body handling uses HTTP payload metadata, external/common-type reference
APIs, effective payload models, and `shouldInline`. It does not run an emitter or
read generated Swagger. `Autorest.getRef` is needed to honor authorable `@useRef`;
the existing AutoRest development dependency already supplies that API.

The ARM service predicate is lintdiff-only isolation because this package enables
both ARM and data-plane rules. On promotion, use the official ARM ruleset as the
applicability boundary rather than adding descendant provider-namespace guards.
Promotion must also address the AutoRest-specific override adapter explicitly.

Reference interpretation assumes the standard ARM common-types directory, as in
the fixture and corpus emitter configuration. An arbitrary emitter
`arm-types-dir` override is not a native service semantic and is outside this
comparison. Common-type references interpolate `{arm-types-dir}` before matching.

`isInScope` uses the same AutoRest TCGC context as the emitter. SDK-only operations
are excluded before LRO detection; `reference-shapes/sdkOnly` and a native
negative test prove that a scoped-out custom-error LRO adds no target diagnostic.

## Emission matrix

Source: `packages/typespec-autorest/src/openapi.ts`, especially
`emitResponseObject`, `getSchemaForResponseBody`, `resolveExternalRef`,
`getSchemaOrRef`, `getSchemaForUnion`; and
`core/packages/openapi/src/helpers.ts::shouldInline`.
All outcomes below refer to the selected **top-level** error-response `$ref`.
The surface alone is not evidence for the type shape.

| Authored shape                                                | Emitter branch                                               | Selected field/value                     | Swagger / TypeSpec                   | Fixture                                                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------- |
| Named custom model                                            | Effective payload then non-inline schema                     | Local `$ref`                             | Violation / violation                | `reference-shapes/models`                                                           |
| Model extending standard error                                | Non-inline derived definition (`allOf` is inside definition) | Local `$ref`                             | Violation / violation                | `reference-shapes/derived`                                                          |
| Standard error, `model is` copy                               | `resolveExternalRef`, copied decorators                      | v5 ErrorResponse `$ref`                  | Clean / clean                        | `inline-and-standard/standard`, `copied`                                            |
| Spread plus added property                                    | Non-inline new definition                                    | Local `$ref`                             | Violation / violation                | `reference-shapes/spreads`                                                          |
| Anonymous exact spread                                        | `getEffectivePayloadType` recovers named model               | Local `$ref`                             | Violation / violation                | `reference-shapes/effective`                                                        |
| Unique anonymous model                                        | Inline model                                                 | Absent, object                           | Clean / clean                        | `inline-and-standard/anonymous`                                                     |
| Named scalar, enum, union                                     | Non-inline pending schema                                    | Local `$ref`                             | Violation / violation                | `reference-shapes/scalarError`, `enumError`, `unionError`                           |
| Named array / record                                          | Non-inline model                                             | Local `$ref`                             | Violation / violation                | `reference-shapes/arrayError`, `recordError`                                        |
| Anonymous array / record / generic model                      | `shouldInline`                                               | Absent, array/object                     | Clean / clean                        | `inline-and-standard/arrayBody`, `recordBody`, `generic`                            |
| Friendly-name generic model                                   | `shouldInline` returns false                                 | Local `$ref`                             | Violation / violation                | `reference-shapes/friendly`                                                         |
| Nullable custom / standard model                              | Inline single non-null union member calls `getSchemaOrRef`   | Local / common-type `$ref` plus nullable | Violation / violation; clean / clean | `reference-shapes/nullable`, `inline-and-standard/nullableStandard`                 |
| String, number, boolean literals and string template          | Early literal/template branch                                | Absent, primitive                        | Clean / clean                        | `inline-and-standard/literalBody`, `numberBody`, `booleanBody`, `templateBody`      |
| Built-in scalar / bytes with JSON                             | Early standard scalar branch                                 | Absent, primitive                        | Clean / clean                        | `inline-and-standard/scalarBody`, `bytesBody`                                       |
| Enum member / tuple / literal union                           | Inline schema branches, including tuple fallback             | Absent, primitive/array                  | Clean / clean                        | `inline-and-standard/enumMember`, `tupleBody`, `unionBody`                          |
| Unknown                                                       | Early intrinsic branch                                       | Absent, empty schema                     | Clean / clean                        | `inline-and-standard/unknownBody`                                                   |
| File / binary bytes / multipart                               | `getSchemaForResponseBody` bypasses references               | Absent, file/string                      | Clean / clean                        | `inline-and-standard/fileBody`, `binary`, `multipartBody`                           |
| No body                                                       | No schema emitted                                            | Absent                                   | Clean / clean                        | `inline-and-standard/noBody`                                                        |
| `@useRef` local / v1 / wrong definition                       | External override before type dispatch                       | Nonmatching `$ref`                       | Violation / violation                | `external-references/localError`, `old`, `wrong`                                    |
| `@useRef` / legacy external reference to v5                   | External override before type dispatch                       | Matching `$ref`                          | Clean / clean                        | `external-references/standard`, `legacy`                                            |
| Success response / sync operation / explicit LRO false        | Outside selector                                             | Not selected                             | Clean / clean                        | `inline-and-standard/success`, `sync`, `disabled`; `template-and-versions/disabled` |
| Native async template with custom `Error` / legacy LRO marker | LRO flag from metadata / TCGC                                | Local default-response `$ref`            | Violation / violation                | `template-and-versions/createOrUpdate`, `marked`                                    |

HTTP payload resolution passes an explicit body property's **type**, not the
ModelProperty itself, to the response emitter. Namespace, operation, interface,
and template-parameter types cannot form concrete serializable response bodies.
`void`/`never` do not produce an error-response body. Unsupported non-enum
multi-model unions and null-only schemas produce emitter errors; failed emission
is not evidence of clean Swagger. These are excluded from the successful corpus
population rather than assigned a compliance claim.

## Focused fixtures

| Fixture                 | Intent     | Target evidence                                                                  |
| ----------------------- | ---------- | -------------------------------------------------------------------------------- |
| `non-standard-error`    | Violation  | Retained raw-extension regression, one custom error                              |
| `reference-shapes`      | Violation  | Twelve distinct local reference operations, including a nested namespace         |
| `external-references`   | Violation  | Three invalid references and two compliant overrides                             |
| `inline-and-standard`   | Compliance | Inline/binary/file/multipart fallthroughs and standard references                |
| `template-and-versions` | Violation  | Native custom errors, legacy marker, explicit false override, old-only operation |

The compliant fixture intentionally exercises OpenAPI shapes that other Azure
guidelines discourage. Its `expect.json` records reviewed ambient diagnostics:
documentation, versioning, operation/template conventions, example requirements,
explicit status codes, non-JSON content, and discouraged inline/enum/nullable
types. These do not enforce the target `$ref` contract and are not suppression or
coverage credit. The target rule and validator must both remain silent.

Focused native tests additionally assert data-plane isolation, unused-template
exclusion, nested ARM traversal, and once-per-source-operation deduplication
across statuses and versions. See [migration evidence](migration.md) for corpus
populations, residual differences, and the final conclusion.
