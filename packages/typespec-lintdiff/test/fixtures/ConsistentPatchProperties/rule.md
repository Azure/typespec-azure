---
validatorRuleId: ConsistentPatchProperties
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/consistent-patch-properties
coverageKind: partial
officialTspLints:
  - "@azure-tools/typespec-azure-resource-manager/arm-resource-patch"
---

# ConsistentPatchProperties

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

PATCH request body properties must be consistent with the resource model. The PATCH body
should not contain properties that are not present in the resource definition.

The local lint checks the PATCH body shape against the ARM resource model recursively and reports
properties that are missing from the resource model or moved to a different nesting level.

## Native boundary and partial coverage

The rule uses compiler and HTTP semantic APIs, not a client-generator context or
an emitter. It checks the authored HTTP contract regardless of TCGC `@scope`.
AutoRest can omit a scoped PATCH operation, GET fallback, request property, or
response property. The Swagger validator sees that emitted contract, whereas
this lint sees the native declarations. These differences are intentional and
make Swagger equivalence partial; project overlap does not prove full parity.

`scoped-property`, `scoped-get-fallback`, and `scoped-patch-operation` retain
Swagger-compliant expectations and record a native diagnostic in their snapshots.
`scoped-response-property` is native-compliant and records the reviewed validator
discrepancy. Native unit tests assert the intended result for all four cases.
Do not add an emitter adapter or read TCGC private state to eliminate these gaps.

The provider namespace check isolates this ARM rule in lintdiff's mixed ruleset;
it is not a requirement that every operation carry provider metadata. Evaluate
that isolation separately during official ARM promotion, with ordinary and
nested-namespace coverage. This repair does not change the applicability guard.

## Semantic coverage notes

- The official `@azure-tools/typespec-azure-resource-manager/arm-resource-patch` lint partially
  overlaps by checking top-level PATCH properties, but it does not recursively validate nested
  properties or enforce the same property level.
- The upstream spectral rule also has a noisy tracked-resource case when the resource envelope is
  inherited from external common-types references; that false-positive cell is not used as a local
  source-of-truth fixture.
- The authorable matrix covered here is:
  - nested PATCH property missing from the resource model => invalid
  - PATCH property present in the resource model but at a different level => invalid
  - custom ARM PATCH operation outside registered resource lifecycle operations => invalid
  - PATCH `201` resource response => invalid when the body is inconsistent
  - PATCH without a `200`/`201` response and same-path GET `201` fallback => invalid when the body is inconsistent
  - PATCH `200` non-model response takes precedence over a later model response => invalid because the selected schema has no named properties
  - a response status range containing `200` or `201` is eligible as the PATCH or GET comparison response, after any exact match for that status
  - different source names with the same emitted JSON name => valid
  - nullable object properties recurse like emitted object schemas => invalid when nested shapes differ, valid when they match
  - matching property names whose array/scalar schemas have no named properties => valid
  - properties scoped away from AutoRest remain part of the native model => invalid when missing from the response
  - a same-path GET scoped away from AutoRest remains a native PATCH fallback => invalid when the body is inconsistent
  - a PATCH operation scoped away from AutoRest remains a native endpoint => invalid when the body is inconsistent
  - response properties scoped away from AutoRest remain available for native comparison => valid when the PATCH body is a same-level subset
  - an undeclared discriminator synthesized into the PATCH schema => invalid when absent from the response schema
  - an encoded authored property replaces a same-named synthesized discriminator => compare the authored property shape
  - PATCH property subset at the same level => valid
  - async PATCH with only `202` and GET fallback to the resource model => valid

## Test Cases

| ID                               | Violation                | Description                                                                                            |
| -------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------ |
| `inconsistent-patch`             | yes                      | PATCH places `displayName` at the top level even though the resource model nests it under `properties` |
| `nested-extra-property`          | yes                      | PATCH adds `properties.extraPatchOnly`, which does not exist in the resource model                     |
| `custom-patch-operation`         | yes                      | A custom ARM PATCH operation places `displayName` at the wrong level                                   |
| `patch-201-response`             | yes                      | PATCH selects its `201` response model and finds a moved property                                      |
| `get-201-fallback`               | yes                      | PATCH falls back to the same-path GET `201` response model and finds a moved property                  |
| `response-precedence`            | yes                      | A scalar PATCH `200` response takes precedence over the matching `201` resource response               |
| `payload-property-shape`         | no                       | Different source names encode to the same matching JSON name                                           |
| `nullable-object-mismatch`       | yes                      | Nullable request and response objects have different nested properties                                 |
| `nullable-object-match`          | no                       | Nullable request and response objects have the same nested properties                                  |
| `non-model-property-shape`       | no                       | Same-named array and scalar properties both emit no nested named properties                            |
| `scoped-property`                | no (Swagger); native yes | AutoRest omits the PATCH-only property; native lint reports it                                         |
| `scoped-get-fallback`            | no (Swagger); native yes | AutoRest omits the GET fallback; native lint uses it                                                   |
| `scoped-patch-operation`         | no (Swagger); native yes | AutoRest omits the PATCH endpoint; native lint checks it                                               |
| `scoped-response-property`       | yes (Swagger); native no | AutoRest omits a matching response property; native lint accepts it                                    |
| `synthesized-discriminator`      | yes                      | AutoRest synthesizes a PATCH discriminator property absent from the response model                     |
| `encoded-discriminator-property` | yes                      | An encoded authored property replaces the synthesized discriminator and has a mismatching nested shape |
| `same-level-subset`              | no                       | PATCH updates only `properties.description`, which is a valid subset of the resource model             |
| `async-get-fallback`             | no                       | PATCH has only a `202` response, so the validator falls back to the GET resource model                 |

Focused rule unit tests additionally cover the TypeSpec HTTP representation
where one response carries a status-code range containing `200`, including the
precedence of an overlapping exact `200` response.
