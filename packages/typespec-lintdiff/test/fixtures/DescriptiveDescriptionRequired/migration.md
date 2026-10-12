# DescriptiveDescriptionRequired migration

## Result and gap summary

The full ARM corpus at the pinned specs revision has **0 validator diagnostics in
0 projects versus 5 native diagnostics in 3 successfully compiled projects**.
Four native findings correspond to emitted `description: ""` fields: Spectral's
truthy-description selector skips these before its blank-string function runs.
The fifth is an explicitly emptied inherited property description that AutoRest
omits. All five targets are represented in the selected latest API versions;
none is explained by an older-only version.

A separate supported-input regression exposed an inert enum-member listener.
The rule now checks members through `enum.members`; the new fixture proves
matching whitespace-member diagnostics in both engines. This fixes a real
native semantic miss, not the corpus count difference.

The native guideline is covered, but **exact executable Swagger equivalence is
intentionally partial**. The native rule rejects empty metadata that the
validator selector ignores. Six compile-failed projects remain unassessed;
the complete raw shard includes 27 excluded Network warnings.

## Contract and official coverage

The native contract is to reject provided documentation metadata whose
`trim()` result is empty, while leaving absent documentation to other rules.
The compiler's `getDoc` is authoritative, including augmented and instantiated
documentation. One finding targets each offending semantic declaration.
There is no prose-quality scoring, HTTP reachability filter, version projection,
emitter invocation, or inspection of OpenAPI overrides in production.

The existing-official-rule gate used fetched
`refs/remotes/origin/feature/lintdiff-migration-new` at
`11eff404b2e58dbb0e5075dd081ea404f8e6b383`. No merged migration PR was found.
Azure Core registers `documentation-required` in `src/linter.ts`, but
`src/rules/require-docs.ts` tests documentation truthiness, not trimmed content.
It accepts nonempty whitespace and has a different declaration/exemption scope.
Its documented LintDiff mapping is `SummaryOrDescription`, not this content
policy. The gate is **partial**: this migration is limited to supplied-content
validation, not another missing-documentation requirement. The maintained ARM
rule documentation and RPC coverage inventory supply no full equivalent or
template enforcement for user-provided blank documentation.

The enum fix follows the official documentation rule's supported member iteration.
The compiler semantic walker declares an `enumMember` listener name but does
not dispatch that event: `navigateEnumType` passes members to a walker branch
that returns for `EnumMember`. No emitter or private metadata helper is needed.
The compiler-only regression and emitted comparison fixture demonstrate why
this small additional traversal is required.

## Source and comparison population

- Specs repository: `Azure/azure-rest-api-specs`, commit
  `f6b53f105b95da05276530a0754a1c71b4f16397`.
- TypeSpec analysis generated at `2026-10-12T05:53:15.715Z`; full runner duration
  `1092229 ms`. All 468 dataset projects were attempted, with 462 successes.
- Scope: resource-manager projects, all local lint rules enabled, concurrency 6.
  The representative preflight selected one `AppConfiguration` project using
  the existing literal filter and limit before the full run.
- Retained Swagger: dataset-selected latest API version, production AutoRest
  validator path, unresolved Spectral document selection; readme suppressions
  are not applied. Dataset generation was recorded at
  `2026-08-06T08:03:27.940Z`.
- TypeSpec: unprojected source programs, with source suppressions. The complete
  raw shard is retained separately from successful-project coverage.
- Production source uses only compiler documentation metadata. The emitter and
  validator investigations below are comparison evidence, not implementation.

Original sources:

- [Validator function](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/descriptive-description-required.ts)
- [Validator documentation](https://github.com/Azure/azure-openapi-validator/blob/main/docs/descriptive-description-required.md)
- [Rule selector](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/az-common.ts)

The function ignores null/non-string inputs and reports strings with empty
`trim()` results at the selected JSON path. However, the selector
`$..[?(@object() && @.description)].description` first requires a truthy value.
An isolated execution of the installed actual Spectral rule confirmed:
missing, `""`, null, and numeric descriptions yield zero findings; `" "` and
tab descriptions yield one; nonblank text yields zero.

## Report reconciliation

| Report                                                                           | Population                        | Rule disposition                                      | Validator projects / diagnostics     | Native projects / diagnostics | Overlap                                |
| -------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------- | ------------------------------------ | ----------------------------- | -------------------------------------- |
| [`docs/coverage_old.md`](../../../docs/coverage_old.md)                          | 450 compiled projects, 210 rules  | Validator never fired; local mapping, `CovKind: none` | Never fired; raw count not published | Not published                 | Not reconstructible from aggregate row |
| Pre-change [`specs/coverage-breakdown.md`](../../../specs/coverage-breakdown.md) | 462/468 projects, 215 known rules | Production, unknown fixture coverage kind             | 0 / 0                                | 3 / 5                         | 0                                      |
| Refreshed full corpus                                                            | 462/468 successful projects       | Same production mapping                               | 0 / 0                                | 3 / 5                         | 0                                      |

The old aggregate report credits mapped-never-fired rules as effectively
covered. The observed report requires same-project diagnostics and awards no
percentage when the validator denominator is zero. The aggregate report has
no pinned specs commit, generation timestamp, or generator revision; these
cannot be reconstructed or used to identify individual unmatched projects.
Both checked-in report revisions were read from the development base above.
The refreshed report is validation evidence and is not included in this PR.

## Complete project sets and version attribution

Validator projects, overlap, and validator-only projects are all **empty**.
The following is the complete TypeSpec-only set in the assessable population:

| Project (`specification/` prefix omitted)                                                   | Selected API version | Native raw / source identities | Selected-version evidence                                                                                              |
| ------------------------------------------------------------------------------------------- | -------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `dataprotection/resource-manager/Microsoft.DataProtection/DataProtection`                   | `2026-04-01-preview` | 1 / 1                          | `findRestorableTimeRanges` POST exists with `description: ""`                                                          |
| `recoveryservicesbackup/resource-manager/Microsoft.RecoveryServices/RecoveryServicesBackup` | `2026-05-31-preview` | 3 / 3                          | All three named resource schemas exist with `description: ""`                                                          |
| `resourcehealth/resource-manager/Microsoft.ResourceHealth/ResourceHealth`                   | `2025-05-01`         | 1 / 1                          | `ProxyResource.name` exists without a description; `@@doc(AvailabilityStatus.name, "")` empties its effective metadata |

The three RecoveryServicesBackup targets are
`BackupResourceEncryptionConfigExtendedResource`,
`BackupResourceEncryptionConfigResource`, and `ResourceGuardProxyBaseResource`.
Supported compiler inspection of all three successful projects reproduced the
same five rule targets, with `getDoc(...) === ""` and no compiler errors.
The source and selected latest Swagger directly establish all five cases;
no guessed name-based version filter or older-only suppression is used.
Older-only diagnostics excluded from this rule's successful-project comparison:
**0**.

## Cardinality and excluded projects

| Identity / population                                                   | Validator | TypeSpec |
| ----------------------------------------------------------------------- | --------: | -------: |
| Assessable raw diagnostics                                              |         0 |        5 |
| Project + Swagger file + JSON path / native source file + line + column |         0 |        5 |
| Project + JSON path / native source location                            |         0 |        5 |
| Complete raw shard, including compile failures                          |         0 |       32 |
| Complete raw shard source identities, including compile failures        |         0 |       10 |

Across the 462 successful projects, 459 have equal zero counts, 3 have higher
TypeSpec counts, and none has a higher validator count. The total TypeSpec
excess is 5; the validator excess is 0. The largest assessable outlier is
RecoveryServicesBackup (3), explained by the three explicit empty model docs.
Source locations and Swagger paths are different identity domains, not a
universal one-to-one normalization.

The six failed projects are exactly the same set in the captured pre-change
TypeSpec results. Their errors concern HTTP bodies or route parameters,
not the warning-only enum documentation change:

| Project (`specification/` prefix omitted)                                                  | Compiler failure                   |
| ------------------------------------------------------------------------------------------ | ---------------------------------- |
| `deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices` | `@typespec/http/duplicate-body`    |
| `monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`                  | `@typespec/http/missing-uri-param` |
| `network/resource-manager/Microsoft.Network/Network/Network`                               | `@typespec/http/missing-uri-param` |
| `quota/resource-manager/Microsoft.Quota/Quota`                                             | `@typespec/http/missing-uri-param` |
| `resources/resource-manager/Microsoft.Resources/deployments`                               | `@typespec/http/duplicate-body`    |
| `servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`                     | `@typespec/http/duplicate-body`    |

Network contributes 27 raw rule warnings at five source identities. These
remain visible in the raw shard but are excluded from both engines' behavioral
comparison. No equivalence claim is made for failed projects.

## Code-backed gap examples

### Empty descriptions bypass the validator selector

- **Classification:** TypeSpec-only.
- **Status:** Intentional native guideline coverage.
- **Project/API version:** DataProtection / `2026-04-01-preview`.
- **Source:** `BackupInstanceResource.tsp`, operation `find`.

The authored operation instantiates a template with an empty effective doc:

```typespec
@action("findRestorableTimeRanges")
find is BackupInstanceResourceOps.ActionSync<
  BackupInstanceResource,
  AzureBackupFindRestorableTimeRangesRequest,
  ArmResponse<AzureBackupFindRestorableTimeRangesResponseResource>,
  OverrideErrorType = CloudError
>;
```

The selected-version POST at the `findRestorableTimeRanges` path contains:

```json
{ "description": "" }
```

| Engine            | Observed result                                         |
| ----------------- | ------------------------------------------------------- |
| Swagger validator | None: its truthy selector skips the empty value         |
| TypeSpec lint     | One: operation `find` has effective `getDoc` value `""` |

**Explanation:** The validator function can reject an empty string, but the
ruleset never selects it. RecoveryServicesBackup's three explicit `@doc("")`
models have the same cause and emitted value. Their selected-version schema
names and documentation values were individually verified.

**Disposition:** Preserve native rejection of supplied empty metadata. Do not
copy the selector defect into production or suppress these valid findings to
equalize counts.

### Empty inherited property documentation is omitted by the emitter

- **Classification:** TypeSpec-only.
- **Status:** Intentional native guideline coverage.
- **Project/API version:** ResourceHealth / `2025-05-01`.
- **Source:** `AvailabilityStatus.tsp` augments the inherited property:

```typespec
@@doc(AvailabilityStatus.name, "");
```

The effective declaration is `ProxyResource.name`, targeted in `models.tsp`.
Its existing `current.` doc comment is overridden by this explicit augmentation.
Compiler inspection confirms an empty documentation value. The selected-version
`ProxyResource` schema retains the property but omits its description.

| Engine            | Observed result                                    |
| ----------------- | -------------------------------------------------- |
| Swagger validator | None: no property-description field is selected    |
| TypeSpec lint     | One: the effective property documentation is empty |

**Explanation:** AutoRest's `getSchemaForModel` adds a property description only
when `getDoc(program, prop)` is truthy. This is an emission difference, not an
old API-version diagnostic or a false positive against the original comment.

**Disposition:** Reject the blank augmented documentation in native authoring.
Do not infer metadata from emitted fields.

### Failed-project warnings are outside the comparison population

- **Classification:** Count-only population mismatch.
- **Status:** Excluded, not assessed.
- **Project/API version:** Network / `2025-07-01`.
- **Source:** The full raw result shard and compilation stdout.

The selected project's compile output reports:

```text
error @typespec/http/missing-uri-param: Route reference parameter 'applicationGatewayAvailableSslOption' but wasn't found in operation parameters
```

**Explanation:** Its 27 rule warnings do not make compilation successful.
The coverage generator excludes this project's diagnostics from both sides,
giving 5 assessed native findings rather than the raw shard's 32. There is no
valid emitted-versus-native behavioral comparison for this failed program.

**Disposition:** Retain raw evidence and the failure limitation; do not change
the documentation rule or claim parity for this project.

## Supported-shape matrix and validation

| Authored shape                                             | Validity / native check                                            | Selected description / Swagger result                                                                             | Expected native result | Evidence                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------- |
| Missing doc on model or parameter                          | Compiler-valid; absent metadata is excluded                        | Missing; no finding                                                                                               | None                   | Compiler-only compliance tests                                        |
| Nonblank or padded nonblank doc                            | Compiler-valid; nonempty `trim()`                                  | Nonblank where emitted; no finding                                                                                | None                   | Native suite and non-empty fixture                                    |
| Whitespace model property                                  | Compiler-valid; blank `trim()`                                     | Whitespace property description; finding                                                                          | Property finding       | `empty-description` fixture                                           |
| Whitespace HTTP parameter                                  | Compiler-valid; blank `trim()`                                     | Whitespace parameter description; finding                                                                         | Parameter finding      | `whitespace-param-description` fixture                                |
| Whitespace enum member                                     | Compiler-valid; enums have an independent Azure `no-enum` advisory | Whitespace `x-ms-enum.values[0].description`; finding                                                             | Member finding         | New `enum-member-description` fixture and native regression           |
| Empty model / operation doc                                | Compiler-valid supplied metadata                                   | Empty value, skipped by truthy selector                                                                           | Declaration finding    | Native empty-string tests and all four selected-version corpus fields |
| Empty augmented property doc                               | Compiler-valid supplied metadata                                   | Omitted property description; no finding                                                                          | Property finding       | ResourceHealth source, native metadata, retained Swagger              |
| Blank namespace / interface / scalar / union / variant doc | Compiler-valid supplied metadata                                   | No universal emitted counterpart; for example `getSchemaForUnionVariant` uses the variant's type, not its own doc | Declaration finding    | Compiler-only target-kind tests; emitter branch research              |
| Tab / CR / LF / nonbreaking-space doc                      | Compiler-valid supported literals                                  | Whitespace where emitted; installed validator matrix confirms tab rejection                                       | Declaration finding    | Native whitespace tests                                               |

The matrix distinguishes semantic shape coverage from HTTP surface coverage.
The rule does not reconstruct emitter-specific documentation or check generated
response/authentication descriptions with no corresponding native documentation
target. These are outside the native contract.

Required checks completed:

- Lintdiff package build and changed-source/test oxlint.
- 22 compiler-only native tests, including the exact incorrect/correct model
  documentation examples and individual property diagnostic locations.
- Four strict rule fixtures: three violations covered and one compliant control
  with matching reviewed ambient diagnostics.
- Strict related groups: six `LroErrorContent` and six
  `SummaryAndDescriptionMustNotBeSame` fixtures. The latter retains its existing
  unreviewed ambient-diagnostic notices; no snapshots changed in those groups.
- Representative one-project preflight, then the full 468-project corpus.

The supplemental `audit:noise` completed, but its local-rule coverage is not
usable: `analyze-noise.ts` omits the fourth `enableLocalLinter` argument required
by `compile-worker.ts`. It also skips cases without `expect.json`. The required
fixture validator supplies that argument and includes all four cases.
This existing supplemental limitation was investigated, not silently treated
as a native rule failure or as passing equivalence evidence.

## Required changes and conclusion

The production update is required for the missed enum-member check.
Its only semantic change is explicit member iteration in the existing enum
callback, replacing the inert member callback. Direct regression fixtures,
snapshots, compiler-only tests, and native documentation accompany it.
No validator, emitter, dataset, or normalization change is required.

Native guideline coverage is established for the tested supported shapes.
The observed corpus count gap is explained; it does not justify changing the
rule to ignore empty strings. Exact Swagger execution parity remains partial
because of selector omissions and native declaration coverage. Corpus overlap
cannot prove universal equivalence, and the six failed projects remain outside
the assessed population.
