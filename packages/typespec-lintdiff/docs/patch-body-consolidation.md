# ARM PATCH property consolidation

## Decision and provenance

This source repair combines `PatchBodyParametersSchema`, `ConsistentPatchProperties`,
and `UnSupportedPatchProperties` into `no-unsafe-patch-body-properties`. It is an
intentional native semantic consolidation, **not exact Swagger equivalence**.
The old local rule implementations and registrations are replaced, not aliased
or enabled alongside the combined rule.

The repair starts from canonical `feature/lintdiff-migration-new` commit
`a213b2d6265b16ccd1a6dff22547b5d7fa84980e`. It preserves the native visibility and
discriminator repair consumed by [#5294](https://github.com/Azure/typespec-azure/pull/5294)
from source `a02f54f67ecf82b934cfc0323ccc6fe788b147b2` (merged
[#5516](https://github.com/Azure/typespec-azure/pull/5516)).
The other source migrations are already merged; their proposed official copies
are [#5384](https://github.com/Azure/typespec-azure/pull/5384) and
[#5456](https://github.com/Azure/typespec-azure/pull/5456).
Their closure is not part of this repair.

[Mark's proposal](https://github.com/Azure/typespec-azure/pull/5294#discussion_r4051406769)
motivates one traversal.
[The clarification](https://github.com/Azure/typespec-azure/pull/5294#discussion_r4056139098)
and user-authorized working decisions supply the detailed native contract.
[Catalina's agreement](https://github.com/Azure/typespec-azure/pull/5294#discussion_r4067049225)
supports consolidation and legacy traceability, not explicit approval of every
visibility, identity, collection or resource-selection decision. Those remain
reviewable working decisions; the discussion must not be resolved just because
the implementation is published.

## Behavior and coverage map

The [combined rule documentation](../src/rules/no-unsafe-patch-body-properties.md)
contains the exact displayed diagnostic-to-legacy-rule mapping and a compiled
standard ARM update-template example. The single native suite is
[`no-unsafe-patch-body-properties.test.ts`](../test/rules/no-unsafe-patch-body-properties.test.ts).

| Area                  | Legacy source                                          | Combined behavior / change                                                                                           | Regression coverage                                                                                                                                             |
| --------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resource subset       | `ConsistentPatchProperties` / #5456                    | Partial encoded JSON layout, not whole-model assignability; preserved                                                | Partial shapes, extra/misnested leaves, differing value types, encoded/inherited overrides, `never`, nullable models                                            |
| Resource selection    | #5456                                                  | Association first; then PATCH 200/201 and same-service/path GET 200/201; association repair brought back into source | Association beats response/GET, 202-only association, every fallback, exact/ranged response precedence, unrelated service/path, absent resource                 |
| Immutable paths       | `UnSupportedPatchProperties` / #5384                   | Exact envelope paths remain immutable even with Update; native effective input replaces emitted mutability           | All five paths, encoded names, similarly named nested fields, ordinary Read/Create exclusion, explicit Create override                                          |
| Partial update safety | `PatchBodyParametersSchema` / #5294                    | Preserve optionality/default checks; expand create-only diagnostic to all exposed non-Update inputs                  | Explicit/implicit PATCH, false/zero/empty defaults, Read/Query regression, visibility overrides, shared operations in both visitation orders                    |
| Identity              | #5294                                                  | Preserve top-level encoded case-insensitive safety exemption; layout still applies                                   | Root identity, nested identity, shared models across policies, missing identity leaf                                                                            |
| Arrays                | All three                                              | Intentional extension: replacement elements may be required; defaults/visibility/layout remain active                | Required element descendants, required array property, nested defaults, matching/missing element properties, item HTTP metadata, array/scalar non-assignability |
| Discriminators        | #5294 native repair; #5456 authored inheritance repair | Native authored properties only; remove subset-rule synthesis                                                        | Absent/optional/required/inherited/excluded fields, encoded object discriminator, inherited `never`; compiler validation not suppressed                         |
| Transport and scope   | All three                                              | Single document bodies only; native properties independent of SDK/emitter scope                                      | Multipart/File/primitive exclusion, explicit `@body` versus `@bodyRoot`, associated/response transport fields, SDK-scoped declarations                          |
| Traversal and targets | All three                                              | One context-aware traversal and metadata cache                                                                       | Cycles, shared siblings, differing counterpart models, per-operation isolation, imported fields retargeted to local use                                         |
| Existing ARM rules    | `arm-resource-patch`, `patch-envelope`                 | Unchanged; overlaps remain visible, no enablement change                                                             | Both subset warnings retained; required envelope presence still reported separately                                                                             |
| Registration          | Three source migrations                                | Only combined source rule enabled; PATCH-to-PUT remains separate                                                     | Registration assertions; official shared ARM ruleset remains disabled during promotion                                                                          |

The supported collection scope is explicit: named record properties still
participate, but record indexer values, tuples and multi-model unions are not
expanded. Nullable single-model unions are supported. Missing resource context
disables only the subset category. Immutable checks never treat arbitrary array
element names as top-level immutable paths. An active stack includes resource,
visibility, path role and check policy; it is not a global visited-model set.

Distinct categories can report on the same property. A shared declaration used
at different JSON paths or operations has separate findings; the same traversal
occurrence does not duplicate a category. Existing `arm-resource-patch` overlap
is separately identified by its own diagnostic code and is deliberately retained.

## Fixture evidence and intentional differences

All **51 fixtures** passed serial, no-update verification with zero missing or
mismatched snapshots: 19 safety, 23 layout and 9 immutable fixtures. Existing
Swagger output and validator-diagnostic snapshots are unchanged. Only native
diagnostic snapshots and reviewed expectations were updated; three new fixtures
add evidence for the intentional contract expansion.

Because the registered ruleset changed, exact native-diagnostic snapshots were
also refreshed for **76 PATCH-bearing fixtures across 19 fixture families**:
74 replaced diagnostics from one or more retired rule IDs, and two fixtures
gained a combined-rule diagnostic that no legacy rule had produced. A full
574-fixture no-update run verified all 76 files byte-for-byte with the harness
serializer and found no retired IDs in any fixture. Compared with the exact
`0cc1c2d73f30d0d0e57d1b1a7dc64bb932040da3` snapshot baseline under identical
inputs, the final run retained the same 574 cases, case classifications and
coverage summary, including the same 21 known unresolved gaps. The remaining 92
snapshot mismatches are unchanged, unrelated baseline drift; none is in the 76
files updated by this consolidation. Eleven of the 76 required complete-file
refreshes rather than category-only replacement: ten capture the current
same-code operation-name diagnostic text or target, while three ambient
diagnostics are newly present (`get-in-operation-name`,
`tenant-level-apis-not-allowed` and `no-unnamed-types`). These are exact current
harness output in PATCH-bearing fixtures, not added parity claims or changes to
Swagger evidence.

| Fixture / family                                             | Retained evidence                                                                                                          |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `PatchBodyParametersSchema/array-replacement-elements`       | Native default and missing item-property findings; required item fields accepted; validator stays silent                   |
| `UnSupportedPatchProperties/explicit-create-immutable-input` | Native immutable and non-Update findings on exposed Create-only location; validator stays silent                           |
| `ConsistentPatchProperties/identity-shape-safety-exemption`  | Missing identity resource field reported; required/default identity safety findings absent                                 |
| `ConsistentPatchProperties/synthesized-discriminator`        | Missing native discriminator is not synthesized; the existing validator-only finding is retained and counted               |
| Safety visibility/discriminator fixtures                     | Excluded inputs and authored optional discriminators remain compliant even where emitted Swagger produces findings         |
| Immutable readonly-reference fixture                         | Retains the validator-only discrepancy rather than imitating reference-resolution loss of annotations                      |
| Inheritance and SDK-scope fixtures                           | Native authored shape/`never`/scope differ deliberately from emitted `allOf`, synthetic properties and generator filtering |

All three legacy IDs map to **one native diagnostic code**. The existing harness
maps by code, not message category. Thus a legacy-compliant fixture can contain a
combined finding from another category, and each legacy corpus row contains the
combined population. These rows cannot prove category-specific equivalence.
Exact snapshots and native category assertions provide that evidence instead.
The harness retains its `no-swagger-violation` classification for the two new
native extensions and its `compliant-mapped-diagnostics` warnings; no validator
change, omitted evidence or weakened native assertion manufactures parity.

Historical standalone evidence remains in each legacy `migration.md`, clearly
labeled historical and superseded. In particular, the old immutable-rule
functional-equivalence conclusion does not describe this combined contract.

## Validation and reproducibility

### Fixture-to-native test mapping

Paths below are relative to `test/fixtures`; each names the directory containing
the original `main.tsp`. Titles are exact native `it`/`it.each` declaration
strings (`%s` retains the parameterized title). This mapping also provides the
promotion handoff without copying validator snapshots into the official library.
SDK-scope decorators are tested only in source, where that dependency already
exists; promotion preserves native shape cases without adding an SDK dependency.
The source-only unrelated-service control is adapted to official opt-in audience
semantics, not retained as a promise to filter mixed compilations.

| Fixture                                                                  | Native test title                                                                                                             |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `PatchBodyParametersSchema/array-replacement-elements`                   | `permits required array element descendants but checks defaults and shape`                                                    |
| `PatchBodyParametersSchema/create-only-patch-property`                   | `excludes %s properties and descendants` (Create)                                                                             |
| `PatchBodyParametersSchema/create-visibility-override`                   | `checks exposed non-Update %s input` (Create)                                                                                 |
| `PatchBodyParametersSchema/default-patch-property`                       | `checks %s default %s`                                                                                                        |
| `PatchBodyParametersSchema/discriminator-required-patch-property`        | `checks an inherited required authored discriminator at its declaration`                                                      |
| `PatchBodyParametersSchema/encoded-identity-compliant`                   | `exempts top-level encoded %s safety, not shape`                                                                              |
| `PatchBodyParametersSchema/encoded-non-identity-violating`               | `does not exempt identity encoded away from the envelope path`                                                                |
| `PatchBodyParametersSchema/file-patch-body-compliant`                    | `does not inspect transport payload: %s` (File/binary)                                                                        |
| `PatchBodyParametersSchema/implicit-optional-patch-compliant`            | `isolates explicit/implicit optionality in both orders (%s)`                                                                  |
| `PatchBodyParametersSchema/multi-model-union-compliant`                  | `does not expand excluded collection/union values: %s`                                                                        |
| `PatchBodyParametersSchema/multipart-patch-body-compliant`               | `does not inspect transport payload: %s` (model/tuple multipart)                                                              |
| `PatchBodyParametersSchema/native-discriminator-compliant`               | `does not synthesize or force discriminator properties: %s`                                                                   |
| `PatchBodyParametersSchema/native-visibility-compliant`                  | `does not let an unrelated Read/Query field change existing warnings: %s`                                                     |
| `PatchBodyParametersSchema/never-property-compliant`                     | `matches encoded names and inherited overrides, including never`                                                              |
| `PatchBodyParametersSchema/nullable-body-required-property`              | `checks required nullable input, nested: %s` (false)                                                                          |
| `PatchBodyParametersSchema/nullable-model-required-property`             | `checks required nullable input, nested: %s` (true)                                                                           |
| `PatchBodyParametersSchema/required-patch-property`                      | `isolates explicit/implicit optionality in both orders (%s)`                                                                  |
| `PatchBodyParametersSchema/synthesized-identity-discriminator-compliant` | `does not synthesize a missing PATCH discriminator for shape comparison`                                                      |
| `PatchBodyParametersSchema/top-level-identity-compliant`                 | `applies safety outside identity when a model is shared across policies`                                                      |
| `ConsistentPatchProperties/async-get-fallback`                           | `uses same-path GET %s for asynchronous PATCH` (200)                                                                          |
| `ConsistentPatchProperties/custom-patch-operation`                       | `reports missing or misnested layout: %s`                                                                                     |
| `ConsistentPatchProperties/encoded-discriminator-property`               | `compares the authored inherited encoded object instead of synthetic metadata`                                                |
| `ConsistentPatchProperties/get-201-fallback`                             | `uses same-path GET %s for asynchronous PATCH` (201)                                                                          |
| `ConsistentPatchProperties/identity-shape-safety-exemption`              | `exempts top-level encoded %s safety, not shape`                                                                              |
| `ConsistentPatchProperties/inconsistent-patch`                           | `reports missing or misnested layout: %s`                                                                                     |
| `ConsistentPatchProperties/inherited-encoded-discriminator-patch`        | `compares the authored inherited encoded object instead of synthetic metadata`                                                |
| `ConsistentPatchProperties/inherited-encoded-discriminator-response`     | `uses the authored inherited encoded resource discriminator shape`                                                            |
| `ConsistentPatchProperties/nested-extra-property`                        | `reports missing or misnested layout: %s`                                                                                     |
| `ConsistentPatchProperties/never-patch-override`                         | `matches encoded names and inherited overrides, including never`                                                              |
| `ConsistentPatchProperties/never-resource-override`                      | `reports a resource property hidden by an inherited never override`                                                           |
| `ConsistentPatchProperties/non-model-property-shape`                     | `does not expand excluded collection/union values: %s`                                                                        |
| `ConsistentPatchProperties/nullable-object-match`                        | `compares nullable model layouts, extra: %s` (false)                                                                          |
| `ConsistentPatchProperties/nullable-object-mismatch`                     | `compares nullable model layouts, extra: %s` (true)                                                                           |
| `ConsistentPatchProperties/patch-201-response`                           | `uses PATCH %s` (201)                                                                                                         |
| `ConsistentPatchProperties/payload-property-shape`                       | `does not inspect transport headers from bodyRoot as JSON fields`; `excludes %s properties and descendants`                   |
| `ConsistentPatchProperties/response-precedence`                          | `prefers PATCH 200 over PATCH 201 and GET`                                                                                    |
| `ConsistentPatchProperties/same-level-subset`                            | `allows partial resource layouts without checking type assignability`                                                         |
| `ConsistentPatchProperties/scoped-get-fallback`                          | `checks %s scoped away from AutoRest` (GET fallback)                                                                          |
| `ConsistentPatchProperties/scoped-patch-operation`                       | `checks %s scoped away from AutoRest` (operation)                                                                             |
| `ConsistentPatchProperties/scoped-property`                              | `checks %s scoped away from AutoRest` (property)                                                                              |
| `ConsistentPatchProperties/scoped-response-property`                     | `uses a matching response property scoped away from AutoRest`                                                                 |
| `ConsistentPatchProperties/synthesized-discriminator`                    | `does not synthesize a missing PATCH discriminator for shape comparison`                                                      |
| `UnSupportedPatchProperties/encoded-inherited-properties`                | `checks inherited encoded immutable envelope names`; `rejects the encoded provisioning-state path only at its reserved level` |
| `UnSupportedPatchProperties/explicit-create-immutable-input`             | `reports independent categories without suppressing a finding`                                                                |
| `UnSupportedPatchProperties/global-operation-compliant`                  | `checks nested provider namespaces and excludes unrelated services` (source-only isolation)                                   |
| `UnSupportedPatchProperties/nested-arm-namespace`                        | `checks nested provider namespaces and excludes unrelated services`                                                           |
| `UnSupportedPatchProperties/non-object-bodies-compliant`                 | `does not inspect transport payload: %s`; `does not expand excluded collection/union values: %s`                              |
| `UnSupportedPatchProperties/patch-with-id-name`                          | `rejects writable top-level %s` (id/name)                                                                                     |
| `UnSupportedPatchProperties/patch-with-location-provisioning-state`      | `rejects writable top-level %s` (location); `rejects the encoded provisioning-state path only at its reserved level`          |
| `UnSupportedPatchProperties/readonly-immutable-properties-compliant`     | `excludes %s properties and descendants`                                                                                      |
| `UnSupportedPatchProperties/readonly-ref-validator-discrepancy`          | `excludes %s properties and descendants` (Read; validator-only evidence stays in fixture)                                     |

### Commands and limitations

Source dependency-closure build, package build, all **100 native tests** and scoped
TypeScript lint pass. Independent review found two HTTP metadata context defects
(ignored annotations in explicit PATCH bodies and transport-only resource
properties); both were repaired with regressions and independently rechecked.
The documentation example is compiled by the native suite, without SDK emitters.

Full source-package lint remains blocked by **228 pre-existing warnings** in
untouched rules and harness files. All changed TypeScript files pass
`oxlint --deny-warnings`; the baseline warnings are not fixed or suppressed by
this scoped repair.

The fixture commands use the existing package `validate` runner with one rule
filter at a time. They must run serially because they share `test/.test-output`.
An initial concurrent verification hit output cleanup from another run; the
affected layout suite was rerun alone successfully. Dependency restoration also
encountered an unrelated Python preparation-hook failure; the subsequent
TypeScript dependency build succeeded. Neither incident is hidden as a successful
original command.

The production corpus uses specs commit
`f6b53f105b95da05276530a0754a1c71b4f16397` and the existing selected-version,
HTTP-reachable validation runner. Its supported `--output` option writes to an
isolated session dataset seeded with 750 byte-identical input files (SHA256
manifest retained with the run). No canonical `specs` outputs are overwritten.
The representative `ProviderHub.Management` project compiled successfully.
The full run completed in **1,340,352 ms**, attempting all 468 projects:
**462 compiled and six failed**, the same six failed project identities as the
checked-in baseline. Failed projects are excluded from both comparison sides.
The combined rule reports **1,258 diagnostics in 122 successful projects**.

| Native category                     | Diagnostics | Projects |
| ----------------------------------- | ----------: | -------: |
| Missing/misnested resource property |         302 |       29 |
| Immutable input                     |          59 |       21 |
| Required input                      |         472 |       74 |
| Default-valued input                |         425 |       68 |
| Exposed non-Update input            |           0 |        0 |

The expanded visibility contract is demonstrated by native tests and fixtures,
not by production findings in this corpus. **79 default findings in 21 projects**
have array-item paths; there are no required-item findings.

For meaningful legacy comparisons, the combined messages were partitioned into
categories before counting (rather than reusing the harness's combined-code rows):

| Legacy validator             | Swagger findings / projects | Native category findings / projects | Overlap projects | Swagger-only / native-only projects |
| ---------------------------- | --------------------------: | ----------------------------------: | ---------------: | ----------------------------------: |
| `ConsistentPatchProperties`  |                    151 / 27 |                            302 / 29 |               27 |                               0 / 2 |
| `UnSupportedPatchProperties` |                    107 / 45 |                             59 / 21 |               21 |                              24 / 0 |
| `PatchBodyParametersSchema`  |                    703 / 93 |                           897 / 105 |               90 |                              3 / 15 |

The two native-only layout projects are Informatica and ManagedNetworkFabric.
The three Swagger-only safety projects remain AccessReview, ConfidentialLedger
and SAPDiscoverySite. The unchanged immutable category totals do not establish
universal equivalence, especially for explicit request-visibility overrides.
Historical standalone safety/layout totals (769/325) are not the current totals
(897/302). Array traversal and per-path occurrences deliberately expand coverage;
not every remaining within-project count difference has been causally classified.
The prior ProgrammableConnectivity attribution and Informatica validator omission
remain limitations, not reasons to reproduce emitter behavior.

The failed projects are DeviceProvisioningServices, TenantActionGroups,
Microsoft.Network/Network, Microsoft.Quota/Quota, Microsoft.Resources/deployments
and ServiceLinker. Their raw compiler output is retained with the isolated run.
No new failure identity was introduced.

The runner fingerprint includes authored Markdown. The standard-template doc
example was completed during the corpus run, but production code stayed fixed.
Recomputing the recorded fingerprint with only that known example edit reversed
exactly reproduces the run fingerprint, proving that the runtime inputs have no
other delta. Final source tests compile the completed example. The run metadata
records the precommit base; the source PR pins the commit containing this same
validated implementation rather than pretending the uncommitted run had a
different Git HEAD.

```powershell
mise exec -- pnpm --filter tsp-lintdiff-local-linter build
mise exec -- pnpm --filter tsp-lintdiff-local-linter exec vitest run test\rules\no-unsafe-patch-body-properties.test.ts
mise exec -- pnpm --filter tsp-lintdiff-local-linter specs:typespec --specs-repo <pinned-specs-checkout> --output <isolated-dataset> --concurrency 6
```

The source package is private: `pnpm change add tsp-lintdiff-local-linter --kind fix`
reports `No package changed`. This document is the source change description;
official promotion updates its package Chronus entry and generated rule docs.
No official default enablement changes are included in this source repair.
