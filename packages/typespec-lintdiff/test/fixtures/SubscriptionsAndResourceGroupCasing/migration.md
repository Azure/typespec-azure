# SubscriptionsAndResourceGroupCasing migration

## Result and gap summary

The final full run assessed 462 successfully compiled projects from the pinned
468-project ARM dataset. The validator reports 26 diagnostics and TypeSpec 38,
both in the same six projects. All 38 source targets are reachable in the
dataset-selected latest API versions. Swagger checks each path key once;
TypeSpec checks each operation. Several methods share one incorrectly cased
path, explaining all 12 extra native diagnostics. Raw shards contain 34 and 49
findings; eight validator and eleven native findings belong to an excluded
compile-failed project.

**Decision:** Correct the native rule's substring false positive and missing
nested-provider scope. Check every complete segment occurrence, rather than copy
the validator's first-substring search. Supported template/custom-route tests
prove these decisions. No corpus semantic remainder is unexplained, but the six
compile-failed projects are outside the behavioral conclusion. Exact executable
Swagger parity is intentionally partial; the native canonical-segment guideline
is the intended contract.

## Existing official coverage and destination

The mandatory gate used the fetched canonical migration target
`2dbe0c0c6b1f3f8580f3b3a0f8d05fbb3ac542ef`.
The prepared source branch started at that exact commit. Exact head/base and
merged-rule-name PR queries found no existing task PR or merged migration.

The classification is **gap**, not template-enforced:

- The registered ARM `arm-no-path-casing-conflicts` rule detects two operation
  paths differing only by case. It does not reject a single path using
  `Subscriptions` or `resourcegroups`, nor two paths using the same wrong casing.
- Core `casing-style` checks declaration names. `no-case-mismatch` checks type
  names. Neither checks literal HTTP path segments.
- ARM `arm-resource-path-segment-invalid-chars` checks a resource model's name
  segment, not canonical subscription/resource-group spelling in scope parameters.
- `CommonTypes.SubscriptionIdParameter` and
  `CommonTypes.ResourceGroupNameParameter` use canonical `@segment` values.
  However, `ArmResourceRead` accepts a supported `BaseParameters` customization.
  The actual incorrect/correct documentation snippets demonstrate that change.
- The pinned corpus already contains this customization in
  `SerialConsole/SerialPort.tsp` and `deploymentScripts/DeploymentScript.tsp`.
- The upstream registration has no RPC identifier. Searches of the maintained
  RPC coverage document found no exact canonical-segment casing mapping.

The catalog's historical `Template-enforced` label is not semantic proof. Its
rationale itself acknowledges that custom routes can misspell these segments.
The code and supported template tests establish the uncovered behavior.

The intended official destination is `typespec-azure-resource-manager`.
The temporary lintdiff rule retains an ARM provider ancestry guard because its
mixed ruleset can execute data-plane rules too. Promotion should use the ARM
ruleset audience instead of requiring provider metadata that the casing check
does not need.

## Native contract and implementation

The rule reads supported `getHttpOperation` metadata. For each operation inside
an ARM provider, including child namespaces, it splits the HTTP path on `/`.
It identifies complete `subscriptions` and `resourceGroups` segments
case-insensitively and requires their canonical spelling.

Each incorrectly cased occurrence produces one warning on the authored
operation. Both names can produce independent warnings. Repeated occurrences
are checked independently. Parameter identifiers and other collection names
that merely share a prefix are not reserved segments.

This semantic layer matches the official sibling `arm-no-path-casing-conflicts`:
both inspect supported HTTP paths and target operations. Their predicates differ.
No emitter, TCGC, OpenAPI metadata API, unsafe mutation, or reference-string
inference implements the decision. There is no custom model traversal.

Required production changes:

- Replace first-substring matching with complete-segment matching.
- Walk provider namespace ancestors for lintdiff's mixed-runner isolation.
- Add native count/target regressions and directly related comparison fixtures.

The rule does not filter findings to one API version. The comparison population
must attribute findings to the dataset-selected version instead.

## Validator behavior and research matrix

Source revision for the fixture metadata checkout:
`1198225afecbb818c3050d4d2a91da92e14e56ce`.
The installed `@microsoft.azure/openapi-validator-rulesets` implementation and
upstream tests were also inspected.

- [Rule function](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/spectral/functions/path-segment-casing.ts)
- [Rule documentation](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/docs/subscriptions-and-resource-group-casing.md)
- [Upstream tests](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/spectral/test/path-segements-case.test.ts)

The ARM Spectral rule visits unresolved Swagger 2.0 `paths` and `x-ms-paths`.
For each path key and each canonical name, it finds the first case-insensitive
`/<name>` substring, extracts exactly the canonical name's length, and compares
the original spelling. It reports at the path key, not at each HTTP method.
It does not require a segment boundary and does not inspect later occurrences.

For research only, AutoRest's `openapi.ts` `emitOperation` delegates endpoint
creation to `initPathItem`. That function starts from `HttpOperation.path` and
chooses `paths` or `x-ms-paths`; shared-route overload suffixes affect the latter
key. The native rule checks the supported HTTP path, not the emitted container
or overload encoding.

| Authored shape                                          | Validity/support                                  | Native check / emitted path behavior                           | Validator result                      | Native result / evidence                                            |
| ------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| Custom operation with `/Subscriptions/...`              | Supported ARM custom operation                    | Incorrect complete segment; present in `paths`                 | One path error                        | One operation warning; `wrong-subscriptions-casing`                 |
| Custom operation with `/resourcegroups/...`             | Supported ARM custom operation                    | Incorrect complete segment; present in `paths`                 | One path error                        | One operation warning; `wrong-resourcegroups-casing`                |
| Canonical custom operation                              | Supported                                         | Both complete names canonical; present in `paths`              | None                                  | None; `compliant`                                                   |
| Standard `ArmResourceRead` with custom `BaseParameters` | Supported named customization                     | `@segment("resourcegroups")` determines the HTTP scope segment | Incorrect scope spelling              | One warning on `read`; actual documentation native test             |
| Same template with `@segment("resourceGroups")`         | Supported                                         | Canonical HTTP scope segment                                   | Compliant scope spelling              | None; actual documentation native test                              |
| Nested provider custom operation                        | Supported, annotated ARM interface                | Provider ancestry supplies applicability; same path casing     | One error                             | One warning; `nested-provider`                                      |
| `/SubscriptionsHistory/...` collection                  | Supported custom operation, no prerequisite error | Different complete segment; present in `paths`                 | Substring false positive              | None; `collection-name-prefix`, reviewed validator finding retained |
| Canonical first occurrence, later `/Subscriptions`      | Supported HTTP route                              | All complete occurrences checked                               | First substring hides the later error | One warning; native regression                                      |
| Two `/Subscriptions` occurrences                        | Supported HTTP route                              | Each incorrect occurrence checked                              | First occurrence only                 | Two warnings on the operation; native count/target regression       |
| Both reserved names uppercase                           | Supported HTTP route                              | Two independent complete names checked                         | Two errors                            | Two warnings on the operation; native regression                    |
| Non-ARM service in mixed lintdiff runner                | Supported data-plane service                      | Infrastructure scope guard excludes it                         | ARM rule not its selected policy      | None; native rule-owned guard regression                            |

These rows cover the meaningful HTTP path families, not arbitrary payload type
families: this rule does not inspect payload schemas. Template expansion and
scope customization resolve through the supported HTTP API. Unsupported or
already compiler-rejected route shapes do not enlarge the contract.

## Reports and comparison population

- [External coverage snapshot](../../../docs/coverage_old.md): source gist link
  is preserved in the report. It declares 450 compiled projects and 210 rules,
  but does not declare a pinned specs revision or per-project identities.
- [Observed coverage breakdown](../../../specs/coverage-breakdown.md):
  diagnostics must overlap in the same successfully compiled project.
- Specs revision:
  `f6b53f105b95da05276530a0754a1c71b4f16397`.
- Dataset generation: `2026-08-06T08:03:27.940Z`,
  `test/harness/spec-dataset.ts`; all 468 resource-manager projects retained.
- Validator execution: production AutoRest Spectral Azure validator,
  semantic/model validators disabled, unresolved Spectral rule inputs;
  readme suppressions not applied.
- Swagger selection: dataset-selected latest API version for each project.
- Native execution: existing full `specs:typespec` runner, all local rules,
  concurrency six. Source findings can include declarations from all versions.
- Final generation: `2026-10-13T04:33:58.909Z`;
  `test/harness/typespec-results.ts`, schema version seven.
  Duration: 1,371,339 ms. The full command completed with exit zero.

| Report                           | Population / mode                      | Validator projects | Local TypeSpec projects |     Official credit |  Same-project overlap | Raw diagnostics            |
| -------------------------------- | -------------------------------------- | -----------------: | ----------------------: | ------------------: | --------------------: | -------------------------- |
| External snapshot row            | 450 compiled / no separate staging row |                  6 |                       6 |                   0 | Aggregate credit only | Not reported               |
| Original checked-in observed row | 462 successful of 468 / production     |                  6 |                       6 | No official mapping |                     6 | 26 validator / 38 TypeSpec |
| Final full run                   | 462 successful of 468 / production     |                  6 |                       6 | No official mapping |                     6 | 26 validator / 38 TypeSpec |

The reports measure different populations and coverage definitions.
The external aggregate cannot identify one-sided projects. Its matching six
counts do not prove identical revisions or diagnostic identities.

The original raw shards contain 34 validator findings and 49 native findings
across seven projects. The original comparison excludes
`specification/resources/resource-manager/Microsoft.Resources/deployments`
because its TypeSpec compilation failed: eight validator and eleven native
findings. The successful-project row therefore uses 26 and 38, respectively.
This is a compile-success population difference, not evidence of a semantic miss.

## Final project sets, normalization, and compilation

**Validator-only projects:** none. **TypeSpec-only projects:** none.
The complete validator, native, and overlap sets are the same six projects:

| Project                                                                                                   | Selected API version | Validator paths | Selected Swagger method units | Native source findings | Native targets reachable in selected version |
| --------------------------------------------------------------------------------------------------------- | -------------------- | --------------: | ----------------------------: | ---------------------: | -------------------------------------------: |
| `specification/maintenance/resource-manager/Microsoft.Maintenance/Maintenance`                            | `2025-10-01-preview` |               7 |                             7 |                      7 |                                            7 |
| `specification/monitor/resource-manager/Microsoft.Insights/Insights/AlertRulesIncidentsApi`               | `2016-03-01`         |               2 |                             2 |                      2 |                                            2 |
| `specification/policyinsights/resource-manager/Microsoft.PolicyInsights/PolicyInsights/PolicyInsightsApi` | `2024-10-01`         |               3 |                             3 |                      3 |                                            3 |
| `specification/resources/resource-manager/Microsoft.Resources/deploymentScripts`                          | `2023-08-01`         |               4 |                             7 |                      7 |                                            7 |
| `specification/resources/resource-manager/Microsoft.Resources/resources`                                  | `2025-04-01`         |               7 |                            15 |                     15 |                                           15 |
| `specification/serialconsole/resource-manager/Microsoft.SerialConsole/SerialConsole`                      | `2024-07-01`         |               3 |                             4 |                      4 |                                            4 |
| **Total**                                                                                                 |                      |          **26** |                        **38** |                 **38** |                                       **38** |

Independent grouping of the final shards matches the generated comparison row.
For each affected path in the selected Swagger files, method keys were counted
separately from path keys. The native count matches those method units in every
affected project; this explains multiplicity without a new production normalizer.

The existing runner's `typespec.projected-http-graph.json` evidence reports the
selected API version and reachable source locations. Every native target in
the table matches that selected projection by source file, line, and column.
There are **zero older-version-only findings** among the 38 compared diagnostics.
This comparison-only projection is not used by production rule logic.

| Identity                                        | Final count |
| ----------------------------------------------- | ----------: |
| Validator raw findings, successful population   |          26 |
| Validator project + Swagger file + JSON path    |          26 |
| Validator project + JSON path, file-independent |          26 |
| Native raw findings, successful population      |          38 |
| Native project + source file + line + column    |          38 |

Three projects have equal counts. TypeSpec is higher in three projects:
`resources` by eight, `deploymentScripts` by three, and `SerialConsole` by one.
The positive difference is twelve; the negative difference is zero.
These identity domains remain different; matching method-unit counts are
supporting evidence, not a claim of universal diagnostic identity.

### Compile failures and assessed-population limit

The final failed-project set is exactly the set recorded in the original
checked-in analysis. No fresh baseline run was performed or claimed.

| Excluded project                                                                                         | Reported compiler error category   |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices` | `@typespec/http/duplicate-body`    |
| `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`                  | `@typespec/http/missing-uri-param` |
| `specification/network/resource-manager/Microsoft.Network/Network/Network`                               | `@typespec/http/missing-uri-param` |
| `specification/quota/resource-manager/Microsoft.Quota/Quota`                                             | `@typespec/http/missing-uri-param` |
| `specification/resources/resource-manager/Microsoft.Resources/deployments`                               | `@typespec/http/duplicate-body`    |
| `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`                     | `@typespec/http/duplicate-body`    |

Only `deployments` contributes this rule's excluded findings: eight validator
and eleven native diagnostics. The other five excluded projects contribute
none to the casing shards. Thus raw all-project counts are 34 validator / 49
native, while the comparable counts are 26 / 38. No equivalence conclusion is
made for any failed project, and these compiler errors are not silently omitted.

## Code-backed gap examples

### Count-only: several operations share one path key

- **Classification:** count-only.
- **Status:** intentional diagnostic unit difference.
- **Project/API version:** `specification/serialconsole/resource-manager/Microsoft.SerialConsole/SerialConsole`
  / `2024-07-01`.
- **Source:** `SerialPort.tsp`, `ParentResourceParameters` and
  `SerialPorts.get` / `SerialPorts.create`.

```typespec
alias ParentResourceParameters = {
  ...ApiVersionParameter;
  ...SubscriptionIdParameter;
  @path @segment("resourcegroups") resourceGroupName: string;
  // Other parent scope parameters are unchanged.
};

get is ArmResourceRead<
  SerialPort,
  BaseParameters = ParentResourceParameters,
  Error = CloudError
>;
create is ArmResourceCreateOrReplaceSync<
  SerialPort,
  BaseParameters = ParentResourceParameters,
  Response = ArmResourceCreatedSyncResponse<SerialPort>,
  Error = CloudError
>;
```

The selected Swagger file contains one path key for both methods:

```json
{
  "path": "/subscriptions/{subscriptionId}/resourcegroups/{resourceGroupName}/providers/{resourceProviderNamespace}/{parentResourceType}/{parentResource}/providers/Microsoft.SerialConsole/serialPorts/{serialPort}",
  "methods": ["get", "put"]
}
```

The compact JSON above records actual selected path/method keys, not a replacement
OpenAPI document.

| Engine   | Observed result                         |
| -------- | --------------------------------------- |
| Swagger  | One finding at the shared `paths` key   |
| TypeSpec | Separate findings on `get` and `create` |

The service has only `v2024_07_01`; this example is not an older-version finding.
The original successful population's remaining count differences have the same
path-versus-operation unit: `resources` contributes eight extra findings,
`deploymentScripts` three, and `SerialConsole` one. Independent selected Swagger
method grouping and latest-version reachability account for all twelve.

**Disposition:** Keep operation targets. Do not suppress one HTTP method merely
to match the validator's path-key total.

### Population difference: a failed project is not comparable

- **Classification:** population mismatch, not a one-sided behavioral finding.
- **Status:** excluded consistently from both engines' comparison.
- **Project:** `specification/resources/resource-manager/Microsoft.Resources/deployments`.
- **Source:** the final TypeSpec project result and its retained compiler output.

The actual project-result fields show:

```json
{
  "project": "specification/resources/resource-manager/Microsoft.Resources/deployments",
  "status": "failed"
}
```

Its compiler output reports:

```text
error @typespec/http/duplicate-body: Operation has a @body and an unannotated parameter. There can only be one representing the body
```

| Population                               | Retained findings                          |
| ---------------------------------------- | ------------------------------------------ |
| Raw shards                               | Eight validator and eleven native findings |
| Successful-project behavioral comparison | Both excluded                              |

No emitted-schema comparison establishes behavior for a project that did not
successfully compile. The result metadata, rather than an illustrative schema,
proves this exclusion.

**Disposition:** Keep the failure and raw findings visible. Do not count them
as either a migration miss or successful native coverage.

### Native regression: nested provider scope

- **Classification:** synthetic semantic miss in the previous native rule.
- **Status:** fixed.
- **Project/API version:** focused `nested-provider` fixture / `2024-01-01`.
- **Source:** `Microsoft.TestService.Nested.CustomRoutes.getWidget`.

```typespec
namespace Nested {
  @armResourceOperations
  interface CustomRoutes {
    @route("/Subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}")
    @get
    getWidget(
      ...CommonTypes.SubscriptionIdParameter,
      ...CommonTypes.ResourceGroupNameParameter,

      @doc("The widget name.")
      @path
      @pattern("^[a-zA-Z0-9_-]+$")
      @maxLength(90)
      widgetName: string,

      ...ApiVersionParameter,
    ): Widget | ErrorResponse;
  }
}
```

The fixture's full parameter list and emitted document are committed snapshots.
Its selected `paths` key retains the authored route prefix and appends
`/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/{widgetName}`.

| Engine                 | Observed result                                                  |
| ---------------------- | ---------------------------------------------------------------- |
| Swagger                | `The path segment Subscriptions should be subscriptions.`        |
| Previous TypeSpec code | Exact provider-namespace membership excluded the child namespace |
| Corrected TypeSpec     | One matching warning on the child operation                      |

The corrected fixture has no ARM prerequisite diagnostic. Its unrelated
`no-openapi` warning is solely the comparison harness's example extension.

**Disposition:** Resolve provider ancestry in the temporary mixed-runner guard.
Do not carry this infrastructure guard into an ARM-only ruleset without need.

### Intentional divergence: a collection name is not a reserved segment

- **Classification:** synthetic validator-only finding.
- **Status:** intentional native contract difference.
- **Project/API version:** focused `collection-name-prefix` fixture / `2024-01-01`.
- **Source:** `Operations.getWidget`.

```typespec
@route("/SubscriptionsHistory/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}")
```

The emitted key preserves that complete route. The retained validator snapshot
reports `The path segment Subscriptions should be subscriptions.` at this key.
The native snapshot has no target-rule warning.

| Engine   | Observed result                                                    |
| -------- | ------------------------------------------------------------------ |
| Swagger  | Prefix substring is mistaken for the complete `subscriptions` name |
| TypeSpec | `SubscriptionsHistory` is a different complete segment; no finding |

**Disposition:** Check complete path segments. The fixture explicitly records
the single reviewed validator diagnostic instead of suppressing it.

### Intentional divergence: later occurrences are independently actionable

The native unit matrix includes a canonical initial `/subscriptions` followed
later by `/Subscriptions`, and a route with two `/Subscriptions` occurrences.
Both are supported custom HTTP paths. The validator's first `indexOf` search
returns only the first occurrence. The native rule reports the later incorrect
occurrence, or both incorrect occurrences, at the authored operation.

**Disposition:** Check all complete occurrences. These cases are synthetic
regressions; they are not claimed as observed one-sided corpus projects.

## Focused validation and documentation examples

- Native suite: eleven tests, no emitter loaded. Messages, counts, and authored
  operation targets are asserted.
- Actual published standard-template examples are read from `rule.md` by the
  native suite. The only added setup is the imported libraries, ARM service,
  `Widget` proxy resource, and standard `Operations` interface.
- Strict comparison fixtures: five cases; three covered violations, one
  validator-clean control with its reviewed ambient warning, and one reviewed
  validator substring discrepancy.
- Fixture diagnostics and all other fixture inputs were searched for the rule's
  code/message and newly affected spellings. Only this rule's group is affected.
- New snapshots were generated by the harness and strictly rerun. Snapshot
  encoding was not rewritten by Prettier.
- Supplemental `audit:noise` completed its 247-case selection. Its three
  violating casing fixtures each reported only the official `no-openapi`
  warning. This is **official-only evidence**, not missing native coverage:
  `analyze-noise.ts` supplies three compile-worker arguments, while
  `compile-worker.ts` enables the local ruleset only when its fourth argument
  equals `"true"`. The strict fixture runner explicitly enables local rules
  and reports the expected casing warnings. The pre-existing noise-audit
  invocation mismatch is disclosed, not fixed in this rule's scope or rerun.

The native providerless/data-plane exclusion test proves lintdiff-owned
applicability. It is not a framework-only test to port unchanged into ARM.
The nested-provider regression likewise needs no redundant namespace filtering
test if promotion removes the infrastructure guard.

## Conclusion

The native rule is functionally aligned with the canonical complete-segment
guideline in all tested supported shapes and all six assessable affected
projects. The final corpus preserves the original 26 / 38 results, explains the
entire twelve-finding count difference, and has no one-sided or older-version-only
remainder. The native update fixes independently demonstrated supported-input
defects; it does not manipulate counts.

The rule is **not exactly executable-equivalent** to the Swagger implementation:
the validator's substring false positive and first-occurrence omission are
intentional, evidenced divergences. Six compile failures limit the assessed
population. Same-project overlap cannot prove universal equivalence or replace
the supported-input tests.
