# Memorandum: differences from the ARM coverage gist

The validator results in this dataset are not expected to match the ARM coverage
gist:

https://gist.github.com/catalinaperalta/b2e7d29a33b4b451bcfcc87e8314565a

The two reports use materially different validator inputs and execution paths.

## Primary difference: external references

The gist was produced from `test/harness/cross-repo-compare.ts`. Its Spectral
path reads each Swagger file into a plain JavaScript object and calls:

```ts
linter.run(swagger);
```

The object has no document source or resolver, so external `$ref` targets are not
resolved. Generated ARM Swagger commonly represents the API-version parameter as
a common-types reference:

```json
{
  "$ref": "../../../../common-types/resource-management/v5/types.json#/parameters/ApiVersionParameter"
}
```

`ApiVersionParameterRequired` has `resolved: true` and must inspect the referenced
parameter to see:

```json
{
  "name": "api-version",
  "in": "query"
}
```

When the reference remains unresolved, the rule sees only `$ref` and can report
that the operation has no API-version parameter. This explains the gist result:

```text
ApiVersionParameterRequired  Fired: 445 of 450 projects
```

The dataset harness instead invokes AutoRest with azure-validator:

```text
npm exec -- autorest --v3 --spectral --azure-validator
  --semantic-validator=false --model-validator=false
  --message-format=json --openapi-type=arm --openapi-subtype=arm
  --use=<openapi-validator> --input-file=<swagger>
```

AutoRest resolves the local references before running rules that require resolved
documents. Consequently, `ApiVersionParameterRequired` does not appear in the
dataset's normalized results.

## Reproduction on Microsoft.Fabric

For the same generated Fabric Swagger:

| Execution                                         | Total Spectral findings | `ApiVersionParameterRequired` |
| ------------------------------------------------- | ----------------------: | ----------------------------: |
| Plain-object Spectral, matching the gist harness  |                     217 |                            13 |
| AutoRest + azure-validator, matching this dataset |                       — |                             0 |

The Fabric operations do contain API-version parameters; they are external
common-types references. The 13 plain-object findings are therefore harness
artifacts, not equivalent validator findings.

## `ParameterDescription` comparison

The same unresolved-reference problem explains another large difference:

| Source            | Projects where `ParameterDescription` fired |
| ----------------- | ------------------------------------------: |
| ARM coverage gist |                                  445 of 450 |
| This dataset      |                                   44 of 468 |

The dataset contains 655 `ParameterDescription` diagnostics across those 44
projects and 84 latest-version Swagger files. The gist's `Fired` value is a
project count, so 44—not 655—is the comparable dataset number.

`ParameterDescription` checks operation parameter objects for a `description`.
When the gist harness receives an unresolved parameter:

```json
{
  "$ref": "../../../../common-types/resource-management/v5/types.json#/parameters/ApiVersionParameter"
}
```

it tests the `$ref` object itself. That object has no `description`, so the rule
reports a violation. The referenced parameter is valid after resolution:

```json
{
  "name": "api-version",
  "in": "query",
  "description": "The API version to use for this operation."
}
```

This was reproduced on the latest Microsoft.Fabric Swagger:

| Execution                                         | `ParameterDescription` findings |
| ------------------------------------------------- | ------------------------------: |
| Plain-object Spectral, matching the gist harness  |                              35 |
| AutoRest + azure-validator, matching this dataset |                               0 |

The gist's 445-project result is therefore dominated by referenced parameters
being evaluated before reference resolution. The dataset's 44 projects represent
resolved findings where emitted parameters actually lack descriptions.

## Other sources of difference

### Ruleset scope

The gist harness loads every exported Spectral ruleset:

```ts
Object.values(spectralRulesets);
```

This applies ARM, common, and data-plane rules regardless of project type. The
dataset explicitly runs with `openapi-type=arm` and `openapi-subtype=arm`.

### API versions

The gist harness validates all Swagger files emitted for a project and reduces
the result to whether each rule fired anywhere in that project. The dataset
retains and validates only the newest API date, regardless of stable or preview
status.

### Project denominator

The gist reports 450 successfully compiled projects but does not record its
specs commit or complete project list. This dataset pins the specs commit in
`_meta.json`; the current corpus contains 468 compiled and validated projects.

### Readme configuration

This dataset validates emitted Swagger directly with `--input-file`. It does not
apply service readme suppressions; `_meta.json` records
`readmeSuppressionsApplied: false`. The gist harness also bypasses readme
suppressions, but production spec-repo LintDiff runs by readme and tag, so its
results may differ from both datasets.

<!-- rule-comparison:start -->

## Complete rule-by-rule comparison

The comparison uses three project-level counts:

- **Gist projects** is the gist's `Fired` count.
- **Plain-object projects** reruns the gist's Spectral invocation over the same
  625 latest-version Swagger files used by this dataset. This isolates execution
  path differences from corpus differences.
- **AutoRest projects** and **AutoRest diagnostics** come from the production
  azure-validator path in this dataset. The delta is
  `AutoRest projects - gist projects`.

Native rules have no plain-object count because they are not executed by
Spectral. A difference is classified as material when it affects at least five
projects and is either at least 50 projects or 25% of the larger count.

| Cause            | Rules | Interpretation                                                                                                                                                                                    |
| ---------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NATIVE-GAP`     |    53 | The gist reports zero findings for all 53 native rules. AutoRest observes 34 of them; the other 19 remain untested by positive examples.                                                          |
| `PLAIN-INFLATED` |    42 | Same-corpus replay materially exceeds AutoRest, proving an execution-path effect rather than denominator drift. External-reference resolution and loading every ruleset are the principal causes. |
| `CONSISTENT`     |    85 | Plain-object and AutoRest project counts are materially consistent; small gist deltas are compatible with the 450-versus-468 denominator and all-version-versus-latest-version policies.          |
| `NO-FINDINGS`    |    30 | Neither Spectral path finds a positive example. This is not evidence that a mapped TypeSpec rule is equivalent.                                                                                   |
| `AUTOREST-ONLY`  |     1 | `IgnoredPropertyNextToRef` appears only in production AutoRest and is absent from the gist's rule inventory.                                                                                      |

No Spectral rule was classified as corpus-drift dominated: for all 158
Spectral/unknown rules, the gist and same-path replay differ by no more than 25
projects. By contrast, 42 rules change materially when only the execution path
changes. This makes the plain-object invocation—not the newer commit or the
latest-version policy—the dominant cause of the large Spectral deltas.

The native comparison exposes a separate systemic gap. Every one of the 53
rules marked `native` has `Fired = 0` in the gist, while production AutoRest
finds 34 native rules, including `OperationsAPIImplementation` in 237 projects,
`RequiredPropertiesMissingInResourceModel` in 144, and
`XmsIdentifierValidation` in 115. The harness catches any exception from
`runNativeRules()` and returns an empty result without recording the error, so
the all-zero native column is consistent with a systematic native-run failure.
Without the gist's raw report or logs, the precise failing call cannot be
reconstructed; however, its native counts cannot be used as coverage evidence.

| Validator rule                                 | Engine   | Gist projects (450) | Plain-object projects on pinned corpus (468) | AutoRest projects (468) | AutoRest diagnostics | Δ projects | Cause          | Root-cause assessment                                                                                                |
| ---------------------------------------------- | -------- | ------------------: | -------------------------------------------: | ----------------------: | -------------------: | ---------: | -------------- | -------------------------------------------------------------------------------------------------------------------- |
| `AdditionalPropertiesAndProperties`            | spectral |                  19 |                                           20 |                       0 |                    0 |        -19 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `AdditionalPropertiesObject`                   | spectral |                   7 |                                            9 |                       0 |                    0 |         -7 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `AllProxyResourcesShouldHaveDelete`            | native   |                   0 |                                            — |                      53 |                  180 |        +53 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `AllResourcesMustHaveGetOperation`             | native   |                   0 |                                            — |                      11 |                   23 |        +11 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `AllTrackedResourcesMustHaveDelete`            | native   |                   0 |                                            — |                      26 |                  114 |        +26 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `ApiHost`                                      | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `ApiVersionEnum`                               | spectral |                   1 |                                            1 |                       0 |                    0 |         -1 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `ApiVersionParameterRequired`                  | spectral |                 445 |                                          468 |                       0 |                    0 |       -445 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `APIVersionPattern`                            | spectral |                   0 |                                            0 |                       3 |                    3 |         +3 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `ArmResourcePropertiesBag`                     | native   |                   0 |                                            — |                      48 |                  209 |        +48 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `ArrayMustHaveType`                            | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `ArraySchemaMustHaveItems`                     | native   |                   0 |                                            — |                       0 |                    0 |          0 | NATIVE-GAP     | The gist recorded zero findings for every native rule; neither run observed this rule, so equivalence is unproven.   |
| `AvoidAdditionalProperties`                    | spectral |                 260 |                                          264 |                     266 |                 1456 |         +6 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `AvoidAnonymousParameter`                      | spectral |                   4 |                                            5 |                       5 |                    5 |         +1 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `AvoidAnonymousTypes`                          | spectral |                   7 |                                            9 |                       9 |                   32 |         +2 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `AvoidEmptyResponseSchema`                     | native   |                   0 |                                            — |                       4 |                   63 |         +4 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `AvoidMsdnReferences`                          | spectral |                   9 |                                            9 |                       9 |                  314 |          0 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `AvoidNestedProperties`                        | spectral |                  10 |                                           10 |                      10 |                   16 |          0 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `AzureResourceTagsSchema`                      | native   |                   0 |                                            — |                       0 |                    0 |          0 | NATIVE-GAP     | The gist recorded zero findings for every native rule; neither run observed this rule, so equivalence is unproven.   |
| `BodyTopLevelProperties`                       | native   |                   0 |                                            — |                      58 |                  611 |        +58 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `CollectionObjectPropertiesNaming`             | spectral |                 140 |                                          149 |                       2 |                    3 |       -138 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `ConsistentPatchProperties`                    | spectral |                 303 |                                          314 |                      27 |                  151 |       -276 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `ConsistentResponseBody`                       | spectral |                  11 |                                           11 |                       0 |                    0 |        -11 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `ConsistentResponseSchemaForPut`               | spectral |                   8 |                                            8 |                       0 |                    0 |         -8 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `ControlCharactersAreNotAllowed`               | native   |                   0 |                                            — |                       0 |                    0 |          0 | NATIVE-GAP     | The gist recorded zero findings for every native rule; neither run observed this rule, so equivalence is unproven.   |
| `DefaultErrorResponseSchema`                   | native   |                   0 |                                            — |                      19 |                  762 |        +19 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `DefaultInEnum`                                | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `DefaultResponse`                              | spectral |                   7 |                                            7 |                       0 |                    0 |         -7 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `DefinitionsPropertiesNamesCamelCase`          | spectral |                  50 |                                           54 |                      54 |                  585 |         +4 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `Delete204Response`                            | spectral |                  19 |                                           20 |                       0 |                    0 |        -19 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `DeleteInOperationName`                        | spectral |                   9 |                                            9 |                       9 |                   25 |          0 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `DeleteMustNotHaveRequestBody`                 | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `DeleteOperationResponses`                     | native   |                   0 |                                            — |                      25 |                   82 |        +25 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `DeleteResponseBodyEmpty`                      | spectral |                  21 |                                           21 |                      21 |                   45 |          0 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `DeleteResponseCodes`                          | spectral |                 103 |                                          109 |                     109 |                 1424 |         +6 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `DeprecatedXmsCodeGenerationSetting`           | native   |                   0 |                                            — |                       0 |                    0 |          0 | NATIVE-GAP     | The gist recorded zero findings for every native rule; neither run observed this rule, so equivalence is unproven.   |
| `DescriptionMustNotBeNodeName`                 | native   |                   0 |                                            — |                     109 |                86264 |       +109 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `DescriptiveDescriptionRequired`               | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `docLinkLocale`                                | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `EnumInsteadOfBoolean`                         | spectral |                 285 |                                          298 |                     298 |                 7878 |        +13 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `EnumMustHaveType`                             | native   |                   0 |                                            — |                       0 |                    0 |          0 | NATIVE-GAP     | The gist recorded zero findings for every native rule; neither run observed this rule, so equivalence is unproven.   |
| `EnumMustNotHaveEmptyValue`                    | native   |                   0 |                                            — |                       0 |                    0 |          0 | NATIVE-GAP     | The gist recorded zero findings for every native rule; neither run observed this rule, so equivalence is unproven.   |
| `EnumMustRespectType`                          | native   |                   0 |                                            — |                       0 |                    0 |          0 | NATIVE-GAP     | The gist recorded zero findings for every native rule; neither run observed this rule, so equivalence is unproven.   |
| `EnumUniqueValue`                              | native   |                   0 |                                            — |                       0 |                    0 |          0 | NATIVE-GAP     | The gist recorded zero findings for every native rule; neither run observed this rule, so equivalence is unproven.   |
| `ErrorResponse`                                | spectral |                 441 |                                          464 |                       0 |                    0 |       -441 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `EvenSegmentedPathForPutOperation`             | spectral |                  20 |                                           22 |                      22 |                   90 |         +2 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `ExtensionResourcePathPattern`                 | native   |                   0 |                                            — |                       0 |                    0 |          0 | NATIVE-GAP     | The gist recorded zero findings for every native rule; neither run observed this rule, so equivalence is unproven.   |
| `Formdata`                                     | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `GetCollectionOnlyHasValueAndNextLink`         | spectral |                  60 |                                           62 |                      63 |                  429 |         +3 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `GetCollectionResponseSchema`                  | native   |                   0 |                                            — |                      18 |                   37 |        +18 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `GetInOperationName`                           | spectral |                  26 |                                           28 |                      28 |                   89 |         +2 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `GetMustNotHaveRequestBody`                    | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `GetOperationMustNotBeLongRunning`             | spectral |                   2 |                                            2 |                       2 |                    4 |          0 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `GetResponseCodes`                             | spectral |                  14 |                                           15 |                      15 |                   96 |         +1 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `GuidUsage`                                    | spectral |                  44 |                                           49 |                      49 |                  283 |         +5 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `HeaderDisallowed`                             | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `HostParametersValidation`                     | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `HttpsSupportedScheme`                         | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `IgnoredPropertyNextToRef`                     | unknown  |                   0 |                                            0 |                     104 |                  131 |       +104 | AUTOREST-ONLY  | Production AutoRest reports this rule, but it is absent from the gist and plain-object rule inventory.               |
| `ImplementPrivateEndpointAPIs`                 | native   |                   0 |                                            — |                       4 |                   19 |         +4 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `IntegerTypeMustHaveFormat`                    | native   |                   0 |                                            — |                       2 |                    5 |         +2 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `invalid-ref`                                  | spectral |                 445 |                                          468 |                       0 |                    0 |       -445 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `InvalidSkuModel`                              | spectral |                   4 |                                            7 |                       7 |                    7 |         +3 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `InvalidVerbUsed`                              | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `LatestVersionOfCommonTypesMustBeUsed`         | spectral |                 394 |                                          394 |                     394 |                63188 |          0 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `LicenseHeaderMustNotBeSpecified`              | native   |                   0 |                                            — |                       0 |                    0 |          0 | NATIVE-GAP     | The gist recorded zero findings for every native rule; neither run observed this rule, so equivalence is unproven.   |
| `ListInOperationName`                          | spectral |                  52 |                                           55 |                      55 |                  339 |         +3 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `LocationMustHaveXmsMutability`                | spectral |                  85 |                                           91 |                      92 |                  665 |         +7 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `LongRunningOperationsOptionsValidator`        | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `LongRunningResponseStatusCodeDataPlane`       | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `LroErrorContent`                              | spectral |                  55 |                                           58 |                      58 |                 3906 |         +3 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `LroExtension`                                 | spectral |                  14 |                                           14 |                      14 |                   39 |          0 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `LroHeaders`                                   | spectral |                 337 |                                          350 |                       0 |                    0 |       -337 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `LroLocationHeader`                            | spectral |                  39 |                                           46 |                      46 |                  236 |         +7 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `LroPatch202`                                  | spectral |                  23 |                                           24 |                      24 |                   60 |         +1 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `LroPostMustNotUseOriginalUriAsFinalState`     | spectral |                   1 |                                            1 |                       1 |                    1 |          0 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `LroStatusCodesReturnTypeSchema`               | spectral |                   3 |                                            3 |                       3 |                   20 |          0 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `LroWithOriginalUriAsFinalState`               | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `MissingDefaultResponse`                       | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `MissingSegmentsInNestedResourceListOperation` | spectral |                  47 |                                           49 |                      49 |                  529 |         +2 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `MissingTypeObject`                            | native   |                   0 |                                            — |                       0 |                    0 |          0 | NATIVE-GAP     | The gist recorded zero findings for every native rule; neither run observed this rule, so equivalence is unproven.   |
| `MissingXmsErrorResponse`                      | native   |                   0 |                                            — |                       9 |                   20 |         +9 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `MsPaths`                                      | spectral |                   5 |                                            6 |                       0 |                    0 |         -5 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `MutabilityWithReadOnly`                       | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `NamePropertyDefinitionInParameter`            | spectral |                 445 |                                          468 |                       0 |                    0 |       -445 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `NestedResourcesMustHaveListOperation`         | native   |                   0 |                                            — |                      25 |                   70 |        +25 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `NextLinkPropertyMustExist`                    | spectral |                 139 |                                          149 |                       0 |                    0 |       -139 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `NoDuplicatePathsForScopeParameter`            | spectral |                   3 |                                            4 |                       4 |                   41 |         +1 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `NoErrorCodeResponses`                         | spectral |                  20 |                                           22 |                      22 |                  155 |         +2 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `NonApplicationJsonType`                       | spectral |                   4 |                                            3 |                       3 |                   20 |         -1 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `NonEmptyClientName`                           | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `Nullable`                                     | spectral |                  64 |                                           67 |                       0 |                    0 |        -64 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `OperationId`                                  | spectral |                 263 |                                          271 |                       0 |                    0 |       -263 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `OperationIdNounConflictingModelNames`         | spectral |                  53 |                                           57 |                      57 |                  649 |         +4 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `OperationIdNounVerb`                          | spectral |                  32 |                                           35 |                      35 |                  265 |         +3 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `OperationIdRequired`                          | native   |                   0 |                                            — |                       0 |                    0 |          0 | NATIVE-GAP     | The gist recorded zero findings for every native rule; neither run observed this rule, so equivalence is unproven.   |
| `OperationIdSingleUnderscore`                  | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `OperationsAPIImplementation`                  | native   |                   0 |                                            — |                     237 |                  392 |       +237 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `OperationsApiResponseSchema`                  | spectral |                 178 |                                          189 |                      38 |                   38 |       -140 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `OperationsApiSchemaUsesCommonTypes`           | spectral |                  84 |                                           87 |                      87 |                   88 |         +3 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `OperationsApiTenantLevelOnly`                 | spectral |                   2 |                                            2 |                       2 |                    2 |          0 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `OperationSummaryOrDescription`                | spectral |                   2 |                                            1 |                       1 |                    1 |         -1 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `PageableOperation`                            | native   |                   0 |                                            — |                      69 |                  310 |        +69 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `PageableRequires200Response`                  | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `PaginationResponse`                           | spectral |                 254 |                                          268 |                       0 |                    0 |       -254 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `ParameterDefaultNotAllowed`                   | spectral |                   2 |                                            3 |                       0 |                    0 |         -2 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `ParameterDescription`                         | spectral |                 445 |                                          468 |                      44 |                  655 |       -401 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `ParameterDescriptionRequired`                 | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `ParameterNamesConvention`                     | spectral |                 106 |                                          117 |                       0 |                    0 |       -106 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `ParameterNamesUnique`                         | spectral |                 399 |                                          416 |                       0 |                    0 |       -399 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `ParameterNotDefinedInGlobalParameters`        | spectral |                   8 |                                            9 |                       9 |                   25 |         +1 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `ParameterNotUsingCommonTypes`                 | spectral |                  69 |                                           71 |                      74 |                  525 |         +5 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `ParameterOrder`                               | spectral |                 378 |                                          395 |                       0 |                    0 |       -378 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `ParametersInPointGet`                         | spectral |                  38 |                                           42 |                      42 |                  549 |         +4 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `ParametersInPost`                             | spectral |                  33 |                                           34 |                      34 |                  726 |         +1 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `ParametersOrder`                              | native   |                   0 |                                            — |                       9 |                   54 |         +9 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `ParametersSchemaAsTypeObject`                 | spectral |                   9 |                                            9 |                       9 |                   18 |          0 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `PatchBodyParametersSchema`                    | spectral |                  87 |                                           92 |                      96 |                  711 |         +9 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `PatchContentType`                             | spectral |                 348 |                                          363 |                       0 |                    0 |       -348 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `PatchIdentityProperty`                        | spectral |                  22 |                                           23 |                      23 |                   92 |         +1 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `PatchInOperationName`                         | spectral |                  14 |                                           15 |                      15 |                   17 |         +1 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `PatchPropertiesCorrespondToPutProperties`     | spectral |                 308 |                                          320 |                       0 |                    0 |       -308 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `PatchResponseCodes`                           | spectral |                  60 |                                           63 |                      63 |                  183 |         +3 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `PatchSkuProperty`                             | spectral |                  20 |                                           23 |                      23 |                  131 |         +3 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `PathCharacters`                               | spectral |                   4 |                                            4 |                       0 |                    0 |         -4 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `PathContainsResourceGroup`                    | spectral |                   2 |                                            3 |                       3 |                   43 |         +1 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `PathContainsResourceType`                     | spectral |                   8 |                                           10 |                      10 |                   34 |         +2 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `PathContainsSubscriptionId`                   | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `PathForNestedResource`                        | spectral |                  20 |                                           21 |                      21 |                  104 |         +1 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `PathForResourceAction`                        | spectral |                  27 |                                           28 |                      28 |                  159 |         +1 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `PathForTrackedResourceTypes`                  | spectral |                  20 |                                           23 |                      27 |                   89 |         +7 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `PathParameterNames`                           | spectral |                  38 |                                           40 |                       0 |                    0 |        -38 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `PathParameterSchema`                          | spectral |                 390 |                                          413 |                       0 |                    0 |       -390 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `PathResourceProviderMatchNamespace`           | native   |                   0 |                                            — |                      10 |                  120 |        +10 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `PathResourceProviderNamePascalCase`           | native   |                   0 |                                            — |                      19 |                  522 |        +19 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `PathResourceTypeNameCamelCase`                | native   |                   0 |                                            — |                      10 |                  216 |        +10 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `Post201Response`                              | spectral |                   3 |                                            3 |                       0 |                    0 |         -3 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `PostOperationIdContainsUrlVerb`               | native   |                   0 |                                            — |                      98 |                  785 |        +98 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `PostResponseCodes`                            | spectral |                 109 |                                          114 |                     114 |                 1172 |         +5 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `PreviewVersionOverOneYear`                    | native   |                   0 |                                            — |                     110 |                  360 |       +110 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `PrivateEndpointResourceSchemaValidation`      | native   |                   0 |                                            — |                       4 |                    4 |         +4 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `PropertiesTypeObjectNoDefinition`             | spectral |                  77 |                                           79 |                       0 |                    0 |        -77 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `PropertyDescription`                          | spectral |                  90 |                                           96 |                       0 |                    0 |        -90 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `PropertyType`                                 | spectral |                  89 |                                           95 |                       0 |                    0 |        -89 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `ProvisioningStateMustBeReadOnly`              | spectral |                  89 |                                           92 |                      94 |                 5022 |         +5 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `ProvisioningStateSpecifiedForLROPatch`        | spectral |                  14 |                                           15 |                      13 |                   40 |         -1 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `ProvisioningStateSpecifiedForLROPut`          | spectral |                  61 |                                           63 |                      54 |                  767 |         -7 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `ProvisioningStateValidation`                  | spectral |                  16 |                                           16 |                      16 |                   18 |          0 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `PutGetPatchResponseSchema`                    | spectral |                  13 |                                           14 |                      14 |                   50 |         +1 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `PutInOperationName`                           | spectral |                  50 |                                           53 |                      53 |                  177 |         +3 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `PutPath`                                      | spectral |                  48 |                                           53 |                       0 |                    0 |        -48 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `PutRequestResponseScheme`                     | spectral |                  36 |                                           38 |                       0 |                    0 |        -36 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `PutRequestResponseSchemeArm`                  | spectral |                  36 |                                           38 |                      38 |                  212 |         +2 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `PutResponseCodes`                             | spectral |                 102 |                                          107 |                     107 |                  668 |         +5 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `QueryParametersInCollectionGet`               | spectral |                 119 |                                          126 |                       0 |                    0 |       -119 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `RepeatedPathInfo`                             | spectral |                  23 |                                           24 |                      25 |                   61 |         +2 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `RequestBodyMustExistForPutPatch`              | spectral |                  20 |                                           19 |                       0 |                    0 |        -20 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `RequestBodyNotAllowed`                        | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `RequestBodyOptional`                          | spectral |                  63 |                                           70 |                       0 |                    0 |        -63 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `RequestSchemaForTrackedResourcesMustHaveTags` | spectral |                  25 |                                           27 |                      27 |                   76 |         +2 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `RequiredDefaultResponse`                      | native   |                   0 |                                            — |                       7 |                  178 |         +7 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `RequiredPropertiesMissingInResourceModel`     | native   |                   0 |                                            — |                     144 |                 2950 |       +144 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `RequiredReadOnlySystemData`                   | native   |                   0 |                                            — |                      14 |                 2579 |        +14 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `ReservedResourceNamesModelAsEnum`             | spectral |                   6 |                                            7 |                       7 |                    8 |         +1 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `ResourceHasXMsResourceEnabled`                | spectral |                   3 |                                            3 |                       3 |                    3 |          0 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `ResourceNameRestriction`                      | spectral |                 124 |                                          132 |                     132 |                 7863 |         +8 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `ResponseSchemaSpecifiedForSuccessStatusCode`  | spectral |                   6 |                                            6 |                       6 |                   23 |          0 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `Rpaas_ResourceProvisioningState`              | native   |                   0 |                                            — |                       0 |                    0 |          0 | NATIVE-GAP     | The gist recorded zero findings for every native rule; neither run observed this rule, so equivalence is unproven.   |
| `SchemaDescriptionOrTitle`                     | spectral |                 100 |                                          106 |                     106 |                 7256 |         +6 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `SchemaNamesConvention`                        | spectral |                 239 |                                          257 |                       0 |                    0 |       -239 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `SchemaTypeAndFormat`                          | spectral |                  99 |                                          104 |                       0 |                    0 |        -99 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `SecurityDefinitionDescription`                | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `SecurityDefinitionsStructure`                 | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `SubscriptionIdParameterInOperations`          | spectral |                   6 |                                            7 |                       7 |                   14 |         +1 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `SubscriptionsAndResourceGroupCasing`          | spectral |                   6 |                                            7 |                       7 |                   34 |         +1 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `SuccessResponseBody`                          | spectral |                 198 |                                          208 |                       0 |                    0 |       -198 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `SummaryAndDescriptionMustNotBeSame`           | spectral |                  34 |                                           38 |                      38 |                 1039 |         +4 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `SystemDataDefinitionsCommonTypes`             | spectral |                   2 |                                            2 |                       2 |                    3 |          0 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `SystemDataInPropertiesBag`                    | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `TagsAreNotAllowedForProxyResources`           | spectral |                 313 |                                          322 |                       0 |                    0 |       -313 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `TenantLevelAPIsNotAllowed`                    | spectral |                  24 |                                           28 |                      28 |                   28 |         +4 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `TopLevelResourcesListByResourceGroup`         | native   |                   0 |                                            — |                       3 |                    3 |         +3 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `TopLevelResourcesListBySubscription`          | native   |                   0 |                                            — |                      10 |                   19 |        +10 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `TrackedExtensionResourcesAreNotAllowed`       | spectral |                   9 |                                           10 |                      10 |                   37 |         +1 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `TrackedResourceBeyondsThirdLevel`             | native   |                   0 |                                            — |                      11 |                   38 |        +11 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `TrackedResourcePatchOperation`                | native   |                   0 |                                            — |                      44 |                  253 |        +44 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `TrackedResourcesMustHavePut`                  | native   |                   0 |                                            — |                      21 |                   83 |        +21 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `UniqueClientParameterName`                    | native   |                   0 |                                            — |                       0 |                    0 |          0 | NATIVE-GAP     | The gist recorded zero findings for every native rule; neither run observed this rule, so equivalence is unproven.   |
| `UniqueModelName`                              | native   |                   0 |                                            — |                       0 |                    0 |          0 | NATIVE-GAP     | The gist recorded zero findings for every native rule; neither run observed this rule, so equivalence is unproven.   |
| `UniqueXmsEnumName`                            | native   |                   0 |                                            — |                       0 |                    0 |          0 | NATIVE-GAP     | The gist recorded zero findings for every native rule; neither run observed this rule, so equivalence is unproven.   |
| `UniqueXmsExample`                             | native   |                   0 |                                            — |                      91 |                  812 |        +91 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `UnSupportedPatchProperties`                   | spectral |                  42 |                                           44 |                      46 |                  110 |         +4 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `ValidFormats`                                 | spectral |                   6 |                                            6 |                       6 |                  123 |          0 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `ValidQueryParametersForPointOperations`       | spectral |                  62 |                                           64 |                       0 |                    0 |        -62 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `ValidResponseCodeRequired`                    | native   |                   0 |                                            — |                       0 |                    0 |          0 | NATIVE-GAP     | The gist recorded zero findings for every native rule; neither run observed this rule, so equivalence is unproven.   |
| `VersionConvention`                            | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `VersionPolicy`                                | spectral |                 445 |                                          468 |                       0 |                    0 |       -445 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `XmsClientName`                                | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `XmsClientNameParameter`                       | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `XmsClientNameProperty`                        | spectral |                   0 |                                            0 |                       0 |                    0 |          0 | NO-FINDINGS    | No findings in either Spectral execution; this does not independently prove rule equivalence.                        |
| `XmsEnumValidation`                            | native   |                   0 |                                            — |                       1 |                    1 |         +1 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `XmsExamplesRequired`                          | spectral |                   6 |                                            6 |                       6 |                  483 |          0 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `XmsIdentifierValidation`                      | native   |                   0 |                                            — |                     115 |                 3805 |       +115 | NATIVE-GAP     | The gist recorded zero findings for every native rule; production AutoRest is the only path that observed this rule. |
| `XMSLongRunningOperationProperty`              | spectral |                   3 |                                            3 |                       3 |                    6 |          0 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `XmsPageableForListCalls`                      | spectral |                  75 |                                           77 |                      77 |                  460 |         +2 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `XmsPageableListByRGAndSubscriptions`          | native   |                   0 |                                            — |                       0 |                    0 |          0 | NATIVE-GAP     | The gist recorded zero findings for every native rule; neither run observed this rule, so equivalence is unproven.   |
| `XmsPageableMustHaveCorrespondingResponse`     | native   |                   0 |                                            — |                       0 |                    0 |          0 | NATIVE-GAP     | The gist recorded zero findings for every native rule; neither run observed this rule, so equivalence is unproven.   |
| `XmsParameterLocation`                         | spectral |                   0 |                                            0 |                       3 |                    6 |         +3 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `XmsPathsMustOverloadPaths`                    | spectral |                   1 |                                            1 |                       1 |                    1 |          0 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |
| `XmsResourceInPutResponse`                     | spectral |                 391 |                                          407 |                      14 |                  155 |       -377 | PLAIN-INFLATED | Same-corpus replay proves inflation in the plain-object path (unresolved refs and/or all-ruleset scope).             |
| `XMSSecretInResponse`                          | spectral |                  99 |                                          103 |                     103 |                 1469 |         +4 | CONSISTENT     | Execution paths are broadly consistent; the residual delta is compatible with denominator and API-version selection. |

<!-- rule-comparison:end -->

## Equivalence judgment procedure

Do not use raw diagnostic-count equality, project overlap alone, or
`audit:noise` alone to declare a migration equivalent. Apply the following
steps:

1. Use `validate` to confirm that each violating fixture actually triggers the
   Swagger validator rule and that the mapped TypeSpec diagnostic fires for the
   intended target.
2. Run compliant and boundary fixtures to ensure the TypeSpec rule does not
   introduce false positives.
3. Use `audit:noise` to identify incidental diagnostics, missing mappings, and
   fixtures where only unrelated TypeSpec diagnostics fire. This is supporting
   triage evidence, not proof of equivalence.
4. Compare diagnostic targets or normalized semantic occurrences when both
   sides expose a deterministic shared identity. Never use fuzzy matching to
   manufacture equivalence.
5. Analyze validator-only and TypeSpec-only real-service projects to cover
   authoring patterns absent from the fixture corpus.
6. Classify the rule as equivalent lint, partial coverage, emitter/template
   enforced, not applicable to TypeSpec, or unresolved. Claim equivalence only
   after all known trigger conditions are covered and compliant cases remain
   clean.

## Migrated rules below 100% observed project coverage

This list includes validator rules mapped to
`tsp-lintdiff-local-linter/*`, with at least one assessable validator project,
whose mapped TypeSpec diagnostic did not fire in every assessable validator
project. Rules that never fired in the validator corpus are not included because
this corpus cannot measure their observed coverage.

| Validator rule | Observed coverage | Overlap / assessable | Validator-only projects | TypeSpec-only projects |
| --- | ---: | ---: | ---: | ---: |
| `AvoidAnonymousParameter` | 0.0% | 0 / 5 | 5 | 7 |
| `AvoidAnonymousTypes` | 0.0% | 0 / 7 | 7 | 1 |
| `CollectionObjectPropertiesNaming` | 0.0% | 0 / 2 | 2 | 0 |
| `OperationIdNounConflictingModelNames` | 0.0% | 0 / 55 | 55 | 0 |
| `XmsResourceInPutResponse` | 0.0% | 0 / 13 | 13 | 3 |
| `DescriptionMustNotBeNodeName` | 1.9% | 2 / 105 | 103 | 3 |
| `AllResourcesMustHaveGetOperation` | 9.1% | 1 / 11 | 10 | 1 |
| `UnSupportedPatchProperties` | 15.6% | 7 / 45 | 38 | 17 |
| `XmsPageableForListCalls` | 32.0% | 24 / 75 | 51 | 0 |
| `TopLevelResourcesListByResourceGroup` | 33.3% | 1 / 3 | 2 | 7 |
| `PathResourceProviderNamePascalCase` | 35.3% | 6 / 17 | 11 | 6 |
| `MissingXmsErrorResponse` | 42.9% | 3 / 7 | 4 | 0 |
| `TrackedResourcePatchOperation` | 42.9% | 18 / 42 | 24 | 14 |
| `ParametersSchemaAsTypeObject` | 44.4% | 4 / 9 | 5 | 6 |
| `TrackedResourcesMustHavePut` | 50.0% | 10 / 20 | 10 | 31 |
| `GuidUsage` | 56.3% | 27 / 48 | 21 | 5 |
| `TenantLevelAPIsNotAllowed` | 62.5% | 15 / 24 | 9 | 0 |
| `ImplementPrivateEndpointAPIs` | 66.7% | 2 / 3 | 1 | 25 |
| `NestedResourcesMustHaveListOperation` | 70.8% | 17 / 24 | 7 | 16 |
| `ParametersInPost` | 75.0% | 24 / 32 | 8 | 0 |
| `OperationIdNounVerb` | 79.4% | 27 / 34 | 7 | 27 |
| `XmsExamplesRequired` | 80.0% | 4 / 5 | 1 | 454 |
| `ConsistentPatchProperties` | 85.2% | 23 / 27 | 4 | 4 |
| `ListInOperationName` | 88.7% | 47 / 53 | 6 | 24 |
| `PutRequestResponseSchemeArm` | 94.4% | 34 / 36 | 2 | 8 |
| `GetCollectionOnlyHasValueAndNextLink` | 95.1% | 58 / 61 | 3 | 2 |
| `PatchBodyParametersSchema` | 95.7% | 89 / 93 | 4 | 39 |
| `GetInOperationName` | 96.2% | 25 / 26 | 1 | 38 |
| `PostOperationIdContainsUrlVerb` | 97.9% | 94 / 96 | 2 | 5 |
| `LatestVersionOfCommonTypesMustBeUsed` | 98.2% | 381 / 388 | 7 | 7 |

## Interpretation

The gist remains useful as evidence about the behavior of its cross-repo
comparison harness, but its `Fired`, `Lint`, `Official`, and `Pct` values should
not be treated as measurements of production Swagger LintDiff equivalence.

Use this dataset's raw JSONL when analyzing direct AutoRest/azure-validator
results. For exact spec-repo CI behavior, run production LintDiff with the
service readme and tag so that tag selection and suppressions are also applied.
