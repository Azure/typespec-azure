---
validatorRuleId: LroErrorContent
engine: spectral
tspLints:
  - "tsp-lintdiff-local-linter/lro-error-content"
coverageKind: partial
tspRuleset: resource-manager
---

# LroErrorContent

**Severity:** Swagger error; local TypeSpec warning.
**Applies to:** Resource Manager (ARM), guideline `RPC-Common-V1-05`.

- linter code: [LroErrorContent](https://github.com/Azure/azure-openapi-validator/blob/a970d991d2785184d2786b85e0a345dc3f37bc25/packages/rulesets/src/spectral/az-arm.ts#L233-L249)
- linter doc: [lro-error-content.md](https://github.com/Azure/azure-openapi-validator/blob/a970d991d2785184d2786b85e0a345dc3f37bc25/docs/lro-error-content.md)
- upstream tests: [lro-error-response.test.ts](https://github.com/Azure/azure-openapi-validator/blob/a970d991d2785184d2786b85e0a345dc3f37bc25/packages/rulesets/src/spectral/test/lro-error-response.test.ts)

## Swagger contract and official coverage

The non-resolving validator visits `paths` and `x-ms-paths`, selects operations
whose `x-ms-long-running-operation` is exactly `true`, and checks only existing
`schema.$ref` values on default, 4xx, and 5xx responses. References must match
the ARM common-types v2-or-later `ErrorResponse` pattern. It does not require
bodies, validate inline schemas, resolve references, or check success responses.
The regex is unanchored and the dot in `types.json` is unescaped. Upstream tests
cover a local reference, v1 rejection, and v3/v10 acceptance.

Official coverage is a **gap** on the repair target
`origin/feature/lintdiff-migration-new`. No registered core or ARM rule enforces
this error-payload contract. `no-error-status-codes` checks status selection;
`arm-post-operation-response-codes` checks status sets and success bodies.
Neither checks the error type. The RPC inventory does not list this guideline.
ARM async templates allow an `Error` argument: custom error payloads do not
require bypassing the templates. The `template-and-versions` fixture demonstrates
this authoring path.

## Repaired native contract

For non-GET HTTP endpoints with `Azure.Core.getLroMetadata`, every existing
default, 4xx, or 5xx error payload must use ARM common-types v2-or-later
`ErrorResponse`. This includes inline, primitive, collection, binary, and
multipart payloads: schema inlining is not a semantic exemption. The user
explicitly selected this native payload policy during the repair.

The rule uses HTTP response and read-visibility payload metadata, native ARM
common-type references, and native ARM legacy external-reference metadata.
Standard errors, `model is` copies, and a nullable standard error are accepted.
Derived/custom error models and other payload types are rejected. No body means
no payload to check. Success responses and synchronous operations are excluded.
All response bodies are examined, not an emitter's last-body selection; the
diagnostic is reported once on the authored operation.

`getArmCommonTypeOpenAPIRef` is an ARM library API reading native common-type
records, not an import of `@typespec/openapi` or an emitter invocation. Native
references retain the validator regex, including its quirks; `{arm-types-dir}`
is interpreted as the standard ARM common-types directory.

The production rule does not use:

- TCGC context, SDK scope, or legacy TCGC LRO markers;
- `@typespec/openapi`, extension overrides, or schema-inlining helpers;
- unsafe compiler mutation or version snapshots;
- AutoRest, generated Swagger, private state maps, or copied emitter logic.

The native tests mock AutoRest and TCGC to throw if imported. Their TypeSpec
snippets need neither library nor OpenAPI decorators. OpenAPI is registered in
the virtual test filesystem solely because the existing ARM library imports it.

### Applicability and version boundary

The ARM provider predicate is **lintdiff-only isolation** because the mixed
local ruleset also runs on data-plane services. HTTP service traversal includes
nested namespaces and excludes unused operation templates. Promotion to ARM
should remove this isolation guard, not require provider decorators on each
operation.

The rule inspects the **unprojected authored program**, not every historical
API-version shape. A removed operation remains visible as authored, while an old
return type recorded by `@returnTypeChangedFrom` is not reconstructed. Native
tests cover both facts. Common-type resolution uses the service's native
metadata/default, without claiming per-version dependency resolution.

## Explicit partial-coverage boundaries

These are intentional, observable differences, not full Swagger equivalence:

- Raw `x-ms-long-running-operation: true` and TCGC-only `markAsLro` do not turn a
  synchronous native operation into an LRO for this lint.
- `x-ms-long-running-operation: false` does not disable native LRO checking.
- SDK scope does not exclude an authored HTTP endpoint.
- Inline error schemas that Swagger skips still violate the native standard
  payload policy.
- `@Autorest.useRef` does not change native type checking. A custom error
  overridden to a standard reference remains a native violation; a standard
  native error overridden to a custom reference remains native-clean.
- Historical return types, arbitrary emitter directory overrides, and
  serialization decisions not represented in the authored HTTP payload are
  outside the native comparison.

## Emission matrix

Emitter source is research only: `packages/typespec-autorest/src/openapi.ts`,
especially `emitResponseObject`, `getSchemaForResponseBody`,
`resolveExternalRef`, `getSchemaOrRef`, and `getSchemaForUnion`.
The selected Swagger field is the **top-level error-response `schema.$ref`**.
Unless specified otherwise, rows use native LRO metadata.

| Authored shape                                                       | Emitter branch / selected field                   | Swagger / native result                         | Evidence                                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| Named custom model, derived standard model, spread with extra fields | Named definition / local `$ref`                   | Violation / violation                           | `reference-shapes/models`, `derived`, `spreads`                                        |
| Anonymous exact spread of a custom model                             | Effective payload / local `$ref`                  | Violation / violation                           | `reference-shapes/effective`                                                           |
| Standard error and `model is` copy                                   | ARM reference metadata / standard `$ref`          | Clean / clean                                   | `standard-error`, `inline-and-standard/standard`, `copied`                             |
| Named scalar, enum, union, array, record                             | Named definition / local `$ref`                   | Violation / violation                           | `reference-shapes/scalarError`, `enumError`, `unionError`, `arrayError`, `recordError` |
| Friendly-name generic                                                | Named definition / local `$ref`                   | Violation / violation                           | `reference-shapes/friendly`                                                            |
| Nullable custom / standard error                                     | Single non-null member / local or standard `$ref` | Violation / violation; clean / clean            | `reference-shapes/nullable`, `inline-and-standard/nullableStandard`                    |
| Unique anonymous model                                               | Inline model / absent                             | Clean / violation                               | `inline-and-standard/anonymous`                                                        |
| Anonymous array, record, generic                                     | Inline array or object / absent                   | Clean / violation                               | `inline-and-standard/arrayBody`, `recordBody`, `generic`                               |
| String/number/boolean literal, string template                       | Literal schema / absent                           | Clean / violation                               | `inline-and-standard/literalBody`, `numberBody`, `booleanBody`, `templateBody`         |
| Built-in scalar and JSON bytes                                       | Primitive schema / absent                         | Clean / violation                               | `inline-and-standard/scalarBody`, `bytesBody`                                          |
| Enum member, tuple, literal union                                    | Inline schema/fallthrough / absent                | Clean / violation                               | `inline-and-standard/enumMember`, `tupleBody`, `unionBody`                             |
| Unknown                                                              | Empty schema / absent                             | Clean / violation                               | `inline-and-standard/unknownBody`                                                      |
| File, binary bytes, multipart                                        | Body-specialization branch / absent               | Clean / violation                               | `inline-and-standard/fileBody`, `binary`, `multipartBody`                              |
| Absent body                                                          | No schema / absent                                | Clean / clean                                   | `inline-and-standard/noBody`                                                           |
| Emitter override: local, v1, wrong definition                        | Override / nonstandard `$ref`                     | Violation / violation of underlying custom type | `external-references/localError`, `old`, `wrong`                                       |
| Emitter override: custom type to standard reference                  | Override / standard `$ref`                        | Clean / violation                               | `external-references/standard`                                                         |
| Emitter override: native standard type to local reference            | Override / nonstandard `$ref`                     | Violation / clean                               | `external-references/overriddenStandard`                                               |
| Native ARM legacy external reference                                 | Native metadata / standard `$ref`                 | Clean / clean                                   | `external-references/legacy`; native tests also cover v1/wrong definition/v10          |
| Custom success payload or synchronous operation                      | Outside error/LRO selector                        | Clean / clean                                   | `inline-and-standard/success`, `sync`                                                  |
| Native LRO with explicit false extension                             | LRO extension override / not selected             | Clean / violation                               | `template-and-versions/disabled`, `inline-and-standard/disabled`                       |
| Custom error through native async template                           | LRO metadata / local default `$ref`               | Violation / violation                           | `template-and-versions/createOrUpdate`, `non-standard-error/restartNative`             |
| Raw true extension only or legacy TCGC LRO marker only               | Emitter-specific LRO / local `$ref`               | Violation / clean                               | `non-standard-error/restart`, `template-and-versions/marked`                           |
| SDK-only native endpoint                                             | AutoRest scope / operation absent                 | No emitted comparison / violation               | `reference-shapes/sdkOnly`                                                             |
| Removed native operation                                             | Latest version excludes operation                 | No latest comparison / violation                | `template-and-versions/oldAction`                                                      |
| Historical custom return type, authored standard return type         | Old projection differs from authored type         | Old violation / authored clean                  | Native `checks authored return types without reconstructing historical versions` test  |

`void` and `never` do not produce payloads. Namespace, operation, interface, and
uninstantiated template-parameter types are not concrete serializable bodies.
Unsupported multi-model unions and null-only schemas can fail emission; failure
is not evidence of Swagger compliance. No parity claim is made for failed
emissions.

## Fixture intent and evidence

Four fixtures have shared violations and explicit partial coverage.
`inline-and-standard` is now a native-violation fixture with **zero Swagger
violations**, not a compliant fixture. `standard-error` is the new compliant
native-template control; its ambient documentation, status-set, naming, path,
version, and example diagnostics are explicitly reviewed in `expect.json`.
They do not validate error payloads or count as target coverage.

The original raw-extension `restart` retains its two suppressions solely as
divergence evidence. The added native `restartNative` and
`template-and-versions/createOrUpdate` prove the actionable error-payload gap
without those suppressions. A partial fixture result does not imply every
operation in it matches: see the operation-level matrix above.

See [migration.md](migration.md) for measured fixture counts, corpus populations,
one-sided projects, failures, and remaining uncertainty.
