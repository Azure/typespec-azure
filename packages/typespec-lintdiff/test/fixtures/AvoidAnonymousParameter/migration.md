# AvoidAnonymousParameter migration

## Result and gap summary

**Partial migration, not Swagger equivalence.** In the production, selected-latest-version ARM corpus, 462 of 468 projects compile. Swagger reports **5 findings in 5 projects**, all dictionary bodies; the baseline and patched native request-body check report **0 in 0**. The broader official rule has 20 source warnings in 8 successful projects: 9 nested models and 11 property unions. Excluding one retired-version model leaves 19 in 7, not request-body coverage. The temporary rule reports 8 empty-body warnings in 7 projects that Swagger accepts. Baseline and patched corpus diagnostics are unchanged.

**The template-body fix was needed and implemented.** Thirteen shape comparisons establish the new behavior and controls; no further native change is required within that contract. Dictionary parity remains outside scope. Six identical compilation failures are excluded. This frozen TypeSpec 1.14 rule-overlay experiment is not a full 1.16 dependency upgrade, and the corpus contains no positive instance of the fixed shape.

## Decision and native contract

Extend the existing `@azure-tools/typespec-azure-core/no-unnamed-types`, rather
than promote the temporary rule wholesale. A nonempty unnamed semantic model
used as an actual single-part request body should have a model declaration,
including when passed through an operation, interface, or model template.
This includes unnamed intersections and model spreads, not just AST model
expressions.

The original exemption protected configuration objects such as OAuth2/API-key
settings: see the [author's explanation in #4880](https://github.com/Azure/typespec-azure/pull/4880#discussion_r3616801952).
Removing the exemption globally would be incorrect. The extension resolves the
actual HTTP request body with `getHttpOperation`, requires its originating body
property, and reuses the existing model-identity diagnostic set and envelope
exclusion. It preserves library scoping, warning severity, target locations,
and response behavior. Production logic uses compiler and HTTP APIs only.

Named models, empty bodies, dictionaries, multipart payloads, synthesized
parameter containers, HTTP envelopes, and non-payload template arguments retain
their existing behavior. A dictionary is a supported TypeSpec shape, not an
unobservable or compiler-rejected construct. Requiring dictionary schemas to
be named would be a separate policy expansion, deliberately excluded from this
scoped fix. OpenAPI `x-ms-client-name` overrides are not a native identity API.

### Required changes

**TypeSpec rule update required and implemented:** extend
`packages/typespec-azure-core/src/rules/no-unnamed-types.ts` and its directly
related Core tests, with standard ARM-action integration tests in
`packages/typespec-azure-resource-manager/test/rules/no-unnamed-types.test.ts`.
The official implementation is in [#5522](https://github.com/Azure/typespec-azure/pull/5522).

The directly related fixture changes correct the historical `compliant`
directory's documented classification and add a real `named-body` control.
The temporary `avoid-anonymous-parameter.ts` implementation is unchanged and
is **not** the implementation proposed for promotion. Its empty-body findings
must not be treated as native parity requirements.

## Source of truth and execution profile

| Input                                         | Pinned evidence                                                                                                                                                                                |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger implementation                        | [avoid-anonymous-schema.ts](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/packages/rulesets/src/spectral/functions/avoid-anonymous-schema.ts) |
| Swagger documentation                         | [anonymous-body-parameter.md](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/docs/anonymous-body-parameter.md)                                 |
| Validator source / installed rulesets         | `6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f` / `2.2.6`                                                                                                                                           |
| Specs checkout                                | `Azure/azure-rest-api-specs@f6b53f105b95da05276530a0754a1c71b4f16397`                                                                                                                          |
| Development runner/source base                | `Azure/typespec-azure@cc4dee2b9c9ee6864fcc98f05978f1fc7a119279`                                                                                                                                |
| Baseline official rule                        | canonical `main`, `6293d35e86434233c17adf670294cd537522aed2`                                                                                                                                   |
| Patched official diagnostic implementation    | `49ad17684a6946295a3a939afe47ab84396d1688`                                                                                                                                                     |
| Frozen corpus dependencies                    | TypeSpec `1.14.0`, Azure Core/rulesets `0.70.0`                                                                                                                                                |
| Native destination dependencies               | TypeSpec `1.16.0`, Azure Core `0.72.0`                                                                                                                                                         |
| Development / destination compiler submodules | `a6137cac43a727ce0c2656364fd72d50c272ee4a` / `fa527921f238cc5a76e76c5ac334f7de698ae6cf`                                                                                                        |
| Toolchain                                     | mise-managed Node `26.5.0`, pnpm `11.10.0`                                                                                                                                                     |

The frozen specs installation predates `no-unnamed-types`. An unchanged corpus
run would therefore **not exercise this PR**. Both runs temporarily register the
exact extracted official rule in the isolated installed Core linter and enable
it in the installed ARM and data-plane rulesets. Only the transpiled rule module
changes between baseline and patched runs; compiler, libraries, specs, and rule
registration stay fixed. All 468 project configurations extend the official ARM
ruleset and none explicitly disables the target rule.

An external canary with a direct unnamed body and a template unnamed body emits
exactly **1 baseline warning and 2 patched warnings**. This proves that the
official implementation is loaded; the unchanged temporary rule is not a proxy.
Later destination changes add documentation metadata and composition regression
tests, not diagnostic logic.

| Extracted artifact  | SHA-256                                                            |
| ------------------- | ------------------------------------------------------------------ |
| Baseline TypeScript | `533ed3f37dcd9aa5fa40cfab037ebb686bdc694e61f10a1b0de6734331907175` |
| Baseline JavaScript | `fa82ec2c27c575e81a5d638fcce95f9c271995a714d3045f6cbf80f6377029bb` |
| Patched TypeScript  | `42f8651b5dda586223166b5bc5d671f4c297ae548e77cc7d5b9d843ec1447c15` |
| Patched JavaScript  | `7e8a5c3c3cc4e4993bc152aa10bf896891bb5461fe56ac7bb21f639694ff1191` |

This is a compatibility experiment for the specific rule change, not proof of
a complete Core 0.72/TypeSpec 1.16 package upgrade across these projects.
Current-toolchain native tests and emission research are separate evidence.

## Coverage-report reconciliation

Both reports were inspected before mutation:
[external coverage snapshot](../../../docs/coverage_old.md) and
[observed coverage breakdown](../../../specs/coverage-breakdown.md).
The links show the checked-in historical reports, not the temporary regenerated
reports excluded from this PR.

| Dimension                      | `coverage_old.md`                                      | Original `specs/coverage-breakdown.md`                                                   |
| ------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Population                     | 450 compiled projects; 210 rules                       | 462 successful of 468; 215 rules                                                         |
| Row/category                   | `AvoidAnonymousParameter`, lint                        | `AvoidAnonymousParameter`, production                                                    |
| Validator projects             | 4                                                      | 5                                                                                        |
| Local TypeSpec projects        | 0 credited                                             | 7 observed                                                                               |
| Official projects credited     | 0                                                      | No official mapping for this row                                                         |
| Same-project overlap           | Not reconstructable                                    | 0                                                                                        |
| Validator-only / TypeSpec-only | No per-project identities                              | 5 / 7                                                                                    |
| Raw validator / local findings | Not reported                                           | 5 / 8                                                                                    |
| Generation evidence            | No generator/spec revision or generation time recorded | Swagger `2026-08-06T08:03:27.940Z`; TypeSpec `2026-08-10T09:38:18.108Z`; specs pin above |
| Commit recording the report    | `6a418911dbe5d35992fb5845cf4460d45643fec8`             | `33191ea5d4497bc2a283a36d9d552a2eb9e43538`                                               |

A file-recording commit is not necessarily its generator revision. The older
aggregate cannot identify which project accounts for 4 versus 5; subtracting
the totals cannot reconstruct it. Different recorded populations explain why
those headlines are not interchangeable, but the exact missing identity remains
unrecoverable from that report.

The external report credits migration dispositions, whereas the observed report
requires same-project mapped diagnostics. Here the concrete observed gap is five
dictionary projects versus seven different empty-body projects, not an
aggregation-multiplicity effect. Fixture metadata still maps only the temporary
rule. Mapping the entire official rule would incorrectly treat unrelated
property/union checks as request-body coverage.

The catalog's historical `Infallible` rationale that anonymous schemas cannot
be emitted is disproved by the direct-body fixture and template emission
matrix. This investigation does not rewrite the generated catalog.

## Full corpus and comparable populations

Both full runs used all 468 frozen ARM projects, concurrency 6, after a
successful one-project `developerhub` preflight. The representative project
compiled with 69 diagnostics in both runs.

| Run      | Start / completion, local offset preserved                                | Result                          |
| -------- | ------------------------------------------------------------------------- | ------------------------------- |
| Baseline | `2026-09-20T17:48:06.9066337+08:00` / `2026-09-20T18:08:38.5775269+08:00` | 462 success, 6 failed           |
| Patched  | `2026-09-20T18:11:42.1131467+08:00` / `2026-09-20T18:31:07.2481405+08:00` | Same 462 success, same 6 failed |

The stored Swagger dataset contains 625 files and selects each project's latest
API version. Validator execution is production, unresolved OpenAPI 2 parameter
schemas, not staging. Source suppressions remain effective; no target suppression
was inserted. Ordinary official lint runs on the source program, not a
latest-version-only program. Therefore selected-version attribution is performed
separately rather than counting every raw warning against latest Swagger.

The existing projected HTTP graphs, using the dataset's selected version,
establish reachability for every successful official target except
OnlineExperimentation. For that project, the existing
`projected-enum-worker.ts` was invoked read-only with `2025-08-01-preview`;
it confirms the exact `OnlineExperimentationWorkspace.tsp:51:16` model location.
Source/version inspection corroborates the one retired-property exclusion.
Unsafe version mutation remains confined to comparison research, not production.

### Counts and identities

| Population/check                                             | Raw findings | Deduplicated findings | Projects |
| ------------------------------------------------------------ | -----------: | --------------------: | -------: |
| Swagger `AvoidAnonymousParameter`, successful intersection   |            5 |                     5 |        5 |
| Temporary `avoid-anonymous-parameter`, either run            |            8 |                     8 |        7 |
| Whole official rule, including failed projects, either run   |           21 |                    21 |        9 |
| Whole official rule, 462 successful projects                 |           20 |                    20 |        8 |
| Whole official rule, selected-version HTTP-reachable targets |           19 |                    19 |        7 |
| Official request-body targets within this investigation      |            0 |                     0 |        0 |

Validator identities were calculated both as
`project + Swagger file + JSON path` and as `project + JSON path`; both give 5.
TypeSpec identity is `project + source file + line + column`.
These are different identity domains, not a claimed one-to-one mapping.

| Compared against Swagger over 462 projects | Equal-count projects | Validator-higher projects / total positive difference | TypeSpec-higher projects / total negative difference |
| ------------------------------------------ | -------------------: | ----------------------------------------------------: | ---------------------------------------------------: |
| Temporary rule                             |                  450 |                                                 5 / 5 |                                                7 / 8 |
| Whole official rule, latest reachable      |                  450 |                                                 5 / 5 |                                               7 / 19 |
| Request-body-only native scope             |                  457 |                                                 5 / 5 |                                                0 / 0 |

Same-project overlap is **zero** for all three views. The broader official
comparison is a scope audit, not an equivalence score. The baseline/patched
success sets and diagnostic identities/counts are unchanged across all recorded
rules. No newly warned request-body source target exists in this corpus;
the canary and supported-shape tests supply positive regression evidence.

### All validator-only projects

Each has one finding, all on the selected API version. Native and temporary
target counts are zero.

| Complete project path                                                          | API version          | Verified source and shape                                                                  |
| ------------------------------------------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------ |
| `specification/datafactory/resource-manager/Microsoft.DataFactory/DataFactory` | `2018-06-01`         | `PipelineResource.tsp:89-92`, `createRun`, `Record<unknown>`                               |
| `specification/developerhub/resource-manager/Microsoft.DevHub/DeveloperHub`    | `2025-03-01-preview` | `VersionedTemplate.tsp:57-62`, `generate`, `Record<string>`                                |
| `specification/hdinsight/resource-manager/Microsoft.HDInsight/HDInsight`       | `2025-01-15-preview` | `routes.tsp:113-129`; `models.tsp:1922` aliases `ClusterConfiguration` to `Record<string>` |
| `specification/machinelearningservices/MachineLearningServices.Management`     | `2026-05-15-preview` | `InferenceEndpoint.tsp:131-147`, `PatchModel = Record<unknown>`                            |
| `specification/migrate/resource-manager/Microsoft.OffAzure/OffAzure`           | `2024-12-01-preview` | `TomcatWebApplications.tsp:38-43`, `PatchModel = Record<unknown>`                          |

### All temporary-rule-only projects

All use selected version `2024-03-03-preview`. Every listed operation's emitted
body schema was inspected and is exactly `{ "type": "object" }`.
Swagger and the official target rule emit zero for these bodies.

| Complete project path                                                                | Source targets                 | Findings |
| ------------------------------------------------------------------------------------ | ------------------------------ | -------: |
| `specification/migrate/resource-manager/Microsoft.Migrate/AKSAssessments`            | `aksroutes.tsp:37`             |        1 |
| `specification/migrate/resource-manager/Microsoft.Migrate/AvsAssessments`            | `avsasmroutes.tsp:39`          |        1 |
| `specification/migrate/resource-manager/Microsoft.Migrate/BusinessCases`             | `businesscaseroutes.tsp:26,33` |        2 |
| `specification/migrate/resource-manager/Microsoft.Migrate/MachineAssessments`        | `machineasmroutes.tsp:34`      |        1 |
| `specification/migrate/resource-manager/Microsoft.Migrate/SqlAssessments`            | `sqlasmroutes.tsp:34`          |        1 |
| `specification/migrate/resource-manager/Microsoft.Migrate/WebAppAssessments`         | `waasmroutes.tsp:35`           |        1 |
| `specification/migrate/resource-manager/Microsoft.Migrate/WebAppCompoundAssessments` | `wacasmroutes.tsp:27`          |        1 |

### All broader-official-only projects

Every source target was inspected. Model findings are nested property types,
not the top-level request-body schemas selected by this Swagger rule.
The raw successful population also includes the retired AzureResilienceManagement
property shown below.

| Complete project path                                                                                                    | Selected API version | Source targets / cause                                             | Latest findings |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------- | ------------------------------------------------------------------ | --------------: |
| `specification/azureresiliencemanagement/resource-manager/Microsoft.AzureResilienceManagement/AzureResilienceManagement` | `2026-06-01-preview` | `models/drill/drill.models.tsp:546`, retired nested property       |       0 (1 raw) |
| `specification/containerservice/resource-manager/Microsoft.ContainerService/aks`                                         | `2026-05-02-preview` | `CommonModels.tsp:2795,2812`, nested models                        |               2 |
| `specification/guestconfiguration/resource-manager/Microsoft.GuestConfiguration/Assignments`                             | `2024-04-05`         | `models.tsp:20`, nested error model                                |               1 |
| `specification/liftrcommvault/Commvault.ContentStore.Management`                                                         | `2026-07-03-preview` | `main.tsp:693`, nested `matchRules`                                |               1 |
| `specification/mission/resource-manager/Microsoft.Mission/Mission`                                                       | `2026-03-01-preview` | Property unions listed below                                       |              11 |
| `specification/onlineexperimentation/OnlineExperimentation.Management`                                                   | `2025-08-01-preview` | `OnlineExperimentationWorkspace.tsp:51`, nested patch `properties` |               1 |
| `specification/powerbidedicated/resource-manager/Microsoft.PowerBIdedicated/PowerBIDedicated`                            | `2021-01-01`         | `models.tsp:219,574`, nested error/display models                  |               2 |
| `specification/storagemover/resource-manager/Microsoft.StorageMover/StorageMover`                                        | `2026-05-01`         | `models.tsp:814`, nested `sourceTargetMap`                         |               1 |

Mission's eleven exact locations, all under `resourcetypes/`, are
`shared/principal.tsp:11`,
`shared/governedserviceitem.tsp:75,79,88`,
`shared/maintenancemodeconfiguration.tsp:10,17`,
`postActions/approvalspostactions.tsp:20,24,36,50`, and
`community/community.tsp:216`.
They suppress the old `no-unnamed-union` code, not `no-unnamed-types`;
both the baseline and patched official rule report them.

### Compilation exclusions

These six failures are identical in both runs and excluded from **both** sides
of behavioral comparison. Raw stdout/stderr and individual error locations are
retained, not converted into compliant results.

| Complete project path                                                                                    | Compiler error code                | Error occurrences |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------: |
| `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices` | `@typespec/http/duplicate-body`    |                 8 |
| `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`                  | `@typespec/http/missing-uri-param` |                 8 |
| `specification/network/resource-manager/Microsoft.Network/Network/Network`                               | `@typespec/http/missing-uri-param` |                 2 |
| `specification/quota/resource-manager/Microsoft.Quota/Quota`                                             | `@typespec/http/missing-uri-param` |                 4 |
| `specification/resources/resource-manager/Microsoft.Resources/deployments`                               | `@typespec/http/duplicate-body`    |                 2 |
| `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`                     | `@typespec/http/duplicate-body`    |                 8 |

DeviceProvisioningServices also has one raw official warning at
`models.tsp:46:13` (`display`), explaining 21 raw versus 20 successful findings.
None of the five validator findings belongs to a failed project.

## Code-backed gap examples

### Dictionary request schema

- **Classification:** validator-only.
- **Status:** intentional native-contract difference, not a validator false positive.
- **Project/API:** DeveloperHub / `2025-03-01-preview`.
- **Source:** `VersionedTemplate.tsp:57-62`.

```typespec
generate is ArmResourceActionSync<
  VersionedTemplate,
  Record<string>,
  ArmResponse<GenerateVersionedTemplateResponse>,
  BaseParameters = Azure.ResourceManager.Foundations.SubscriptionBaseParameters
>;
```

The selected POST `.../templates/{templateName}/versions/{templateVersion}/generate`,
`parameters[4].schema`, is:

```json
{ "type": "object", "additionalProperties": { "type": "string" } }
```

| Engine                         | Observed result                                         |
| ------------------------------ | ------------------------------------------------------- |
| Swagger                        | One error because `additionalProperties` is defined.    |
| Baseline/patched official lint | No error: `Record` is a named semantic dictionary type. |
| Temporary lint                 | No error: it requires an unnamed AST model expression.  |

**Explanation/disposition:** the native naming contract accepts dictionaries.
The three `Record<unknown>` findings emit `additionalProperties: {}` instead;
HDInsight emits the same string dictionary as DeveloperHub. All five were
inspected. Do not expand this fix into a dictionary prohibition or claim full
Swagger equivalence.

### Empty action body

- **Classification:** temporary-TypeSpec-only.
- **Status:** false positive relative to Swagger and the chosen official contract.
- **Project/API:** AKSAssessments / `2024-03-03-preview`.
- **Source:** `aksroutes.tsp:34-37`.

```typespec
#suppress "@azure-tools/typespec-azure-resource-manager/no-empty-model" "Download URL Post Action body is empty."
@added(AKSApiVersions.v2024_03_03_preview)
@doc("Get URL for downloading AKS Assessment Report.")
downloadUrl is ArmResourceActionAsync<AKSAssessment, {}, DownloadUrl>;
```

Its emitted POST `.../downloadUrl` body schema is:

```json
{ "type": "object" }
```

| Engine                   | Observed result                                                      |
| ------------------------ | -------------------------------------------------------------------- |
| Swagger                  | No finding: no nonempty properties, dictionary, or `allOf`.          |
| Official lint, both runs | No finding: empty model is exempt.                                   |
| Temporary lint           | One finding: its AST expression check does not exclude empty models. |

**Explanation/disposition:** all eight local findings share this cause.
The displayed suppression is for a separate ARM guideline, not the naming rule.
Preserve the official empty-body behavior; do not copy the temporary detector.

### Nested model outside the selected Swagger surface

- **Classification:** broader-official-TypeSpec-only.
- **Status:** intentional existing coverage, unchanged by this fix.
- **Project/API:** GuestConfiguration Assignments / `2024-04-05`.
- **Source:** `models.tsp:18-20`, `ErrorResponse.error`.

```typespec
model ErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}
```

The relevant shape, omitting descriptions, is
`definitions.ErrorResponse.properties.error`:

```json
{
  "type": "object",
  "properties": {
    "code": { "type": "string" },
    "message": { "type": "string" }
  }
}
```

| Engine                            | Observed result                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------- |
| Swagger `AvoidAnonymousParameter` | No finding; this is a nested response property, not a selected parameter schema. |
| Official lint, both runs          | One unnamed-model warning at the property type.                                  |

**Explanation/disposition:** eight selected-version model warnings across six
projects have the same broader nested-property scope. Do not credit them as
request-body migration coverage or remove them.

### Property union outside the selected Swagger surface

- **Classification:** broader-official-TypeSpec-only.
- **Status:** intentional existing coverage.
- **Project/API:** Mission / `2026-03-01-preview`.
- **Source:** `resourcetypes/shared/principal.tsp:11`.

```typespec
type: "User" | "Group" | "ServicePrincipal" | string;
```

The emitted `definitions.Principal.properties.type`, omitting its description:

```json
{
  "type": "string",
  "enum": ["User", "Group", "ServicePrincipal"],
  "x-ms-enum": { "modelAsString": true }
}
```

| Engine                            | Observed result                                                             |
| --------------------------------- | --------------------------------------------------------------------------- |
| Swagger `AvoidAnonymousParameter` | No finding; neither a parameter model nor one of its structural conditions. |
| Official lint, both runs          | One unnamed-union warning here, eleven property unions in the project.      |

**Explanation/disposition:** preserve the official union policy. Its eleven
warnings are not eleven missing Swagger request-model checks.

### Retired-version source target

- **Classification:** population mismatch.
- **Status:** excluded from latest-version comparison, retained in raw totals.
- **Project/API:** AzureResilienceManagement / `2026-06-01-preview`.
- **Source:** `models/drill/drill.models.tsp:544-549`.

```typespec
@doc("Inputs needed for the Recovery Orchestration Plan")
@removed(Versions.v2026_04_01_preview)
recoveryPlanInputs: {
  @doc("Direction of the failover")
  failoverDirection: string;
};
```

The archived projected graph selects `2026-06-01-preview` and does not contain
the diagnostic target `models/drill/drill.models.tsp:546:23`.
The selected Swagger definitions contain no `recoveryPlanInputs` property;
there is no emitted schema to compare for this retired field.

| Engine                                  | Observed result                            |
| --------------------------------------- | ------------------------------------------ |
| Latest Swagger                          | No corresponding emitted property.         |
| Source-program official lint, both runs | One warning on the historical declaration. |

**Explanation/disposition:** reduce 20 source warnings to 19 latest-reachable
warnings. Do not change production lint to suppress valid historical-version
authoring diagnostics.

### Fixed template request body

- **Classification:** missing native behavior.
- **Status:** fixed in the scoped official extension.
- **Evidence:** current-toolchain `template-object` matrix case and native tests.

```typespec
@route("/send") @post op Send<T>(@body body: T): void;
op send is Send<{
  name: string;
}>;
```

The emitted `paths["/send"].post.parameters[0].schema` is:

```json
{
  "type": "object",
  "properties": { "name": { "type": "string" } },
  "required": ["name"]
}
```

| Engine                 | Observed result                                        |
| ---------------------- | ------------------------------------------------------ |
| Swagger                | One error for nonempty inline properties.              |
| Baseline official lint | Zero, because the template-argument exemption applies. |
| Patched official lint  | One warning on the user-authored unnamed model.        |

**Disposition:** use `model Request { name: string; }` and `Send<Request>`.
This is supported TypeSpec with zero compiler errors, not an emitter-invalid
shape used to justify special casing.

## Supported-shape matrix and focused evidence

Thirteen independently compiled TypeSpec 1.16 cases used the actual baseline and
patched rule, the AutoRest test host, and the installed upstream schema helper.
Every case has **zero compiler errors**. This isolates naming semantics rather
than claiming compliance with every unrelated Azure guideline.
The emitted parameter `schema` field is present in every row.

| Authored body shape                             | Emitted schema category                | Baseline / patched / Swagger findings |
| ----------------------------------------------- | -------------------------------------- | ------------------------------------- |
| Direct `{ name: string; }`                      | Inline nonempty object                 | 1 / 1 / 1                             |
| Template `{ name: string; }`                    | Inline nonempty object                 | 0 / 1 / 1                             |
| Template named `Request`                        | Definition `$ref`                      | 0 / 0 / 0                             |
| Template `{}`                                   | Empty object                           | 0 / 0 / 0                             |
| Template `Record<string>`                       | String `additionalProperties`          | 0 / 0 / 1                             |
| Template `Record<unknown>`                      | Empty-schema `additionalProperties`    | 0 / 0 / 1                             |
| Template `{ ...Record<string>; }`               | Dictionary without declared properties | 0 / 0 / 1                             |
| Template `{ ...Record<string>; name: string; }` | Dictionary plus nonempty properties    | 0 / 1 / 1                             |
| Direct `First & Second`                         | Inline merged properties               | 1 / 1 / 1                             |
| Template `First & Second`                       | Inline merged properties               | 0 / 1 / 1                             |
| Template `{ ...First, ...Second }`              | Inline merged properties               | 0 / 1 / 1                             |
| Template named composed model                   | Definition `$ref`                      | 0 / 0 / 0                             |
| Template `string[]`                             | Array with string items                | 0 / 0 / 0                             |

For research, AutoRest's `getOpenAPI2BodyParameter`, `getSchemaOrRef`,
`getSchemaForInlineType`, and `getSchemaForModel` in `src/openapi.ts` explain
parameter schema selection, named references, and dictionary/property output.
The actual emitted values above, not predictions from those functions, determine
the Swagger research results. Intersections merge properties here; they are
not evidence that every native intersection emits `allOf`.

Swagger's null-schema and defined-`x-ms-client-name` exemptions, and its
defined-`allOf` condition, are retained as upstream semantics, not fabricated
native branches. Emitter-specific overrides and malformed Swagger schemas do
not expand the semantic naming contract. Native code does not import AutoRest,
OpenAPI metadata, or unsafe mutation.

### Fixture-to-native coverage

Both fixture cases pass focused validation. The historically named `compliant`
case is a violation; `named-body` is the actual negative control.
No target suppression is used. Three reviewed ambient diagnostics in the
named control concern security descriptions, operation naming, and examples,
not request-body naming.

| Fixture or regression           | Exact native test title                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `compliant/main.tsp`            | `it("flags anonymous model as operation parameter")`                                                   |
| `named-body/main.tsp`           | `it.each(["Request", "{}", "Record<string>"])("does not flag %s bodies")`, named `Request` case        |
| Actual body metadata            | `it.each(["body", "bodyRoot"])("flags an anonymous @%s template argument")`                            |
| Interface template              | `it("flags an anonymous body passed through an interface template")`                                   |
| Spread envelope                 | `it("flags an anonymous body inside a spread request envelope")`                                       |
| Shared declaration              | `it("reports a shared anonymous body once across operations")`                                         |
| Imported template / user target | `it("flags a user argument to an imported operation template")`                                        |
| Imported library declaration    | `it("does not report anonymous bodies declared in an external library")`                               |
| Composition                     | `it.each(["First & Second", "{ ...First, ...Second }"])("flags an unnamed composed request body: %s")` |
| Named composition               | `it("does not flag a named composed request body")`                                                    |
| Auth configuration              | `it("does not flag OAuth2 configuration")`                                                             |
| Parameter options               | `it("does not flag template parameter options")`                                                       |
| Multipart                       | `it("does not flag a multipart template body")`                                                        |
| Response policy                 | `it("does not change template response-body exemptions")`                                              |
| Envelope                        | `it("does not flag an HTTP envelope passed to bodyRoot")`                                              |
| Synthesized body                | `it("does not flag a synthesized request body")`                                                       |
| Standard ARM actions            | `it.each(["ArmResourceActionSync", "ArmResourceActionAsync"])("requires named request bodies in %s")`  |

Focused Core tests pass **32 cases**. Full Core validation passes **381 tests,
2 skipped**. Core build, package lint, docs regeneration and explicit generated
docs formatting pass. The two affected ARM integration cases pass in the full
ARM run, but the broader ARM run has **20 test/hook timeouts and 456 passing
tests**. Those failures have not been established as pre-existing and are not
reported as a green full ARM suite. Publication records broader validation
separately rather than inferring success from the focused cases.

`audit:noise` reports the historical direct-body fixture's one official warning
as `gap_unmapped_tsp_diagnostics`. Its invocation of `compile-worker` omits the
fourth local-linter enablement argument; the worker enables local rules only
when that value is `"true"`. Therefore this audit is official-only while the
fixture mapping names the temporary rule. It is supporting direct-body coverage
evidence, not proof of missing official enforcement. Its global success is not
an all-fixtures validation result.

### Data-plane supplement

The existing `compare` runner separately compiled
`specification/widget/data-plane/WidgetAnalytics` in baseline and patched modes,
using its official data-plane ruleset. Both runs succeed and emit two versions,
`2022-11-01-preview` and `2022-12-01`; neither has the validator target or either
TypeSpec target code. This is a negative control, not positive coverage of the
new template branch or a full data-plane corpus.

Each supplement also records 20 `invalid-ref` example-resolution diagnostics
among 88 total validator occurrences. The comparison helper resolves those
example references relative to the harness; they are not target findings.
The target Spectral rule reads unresolved schemas. Do not describe this result
as an entirely clean validator run or mix these all-version totals into the
468-project selected-version ARM denominator.

## Reproduction and retained artifacts

Use the pinned specs/data/dependency profile above. Extract each official rule
with `git show <sha>:packages/typespec-azure-core/src/rules/no-unnamed-types.ts`,
transpile without semantic edits, and register it in the isolated installed
Core linter and official rulesets. Verify the two-body canary before using the
corpus numbers. Merely rebuilding the temporary local rule is insufficient.

Capture the corpus cleanup manifest **before** any run. Set an isolated npm
prefix because these older runners use `npm link`; do not disable the existing
package lock, which would force unnecessary fresh dependency resolution.

```powershell
$Specs = "C:\dev\worktrees\azure-rest-api-specs-lintdiff-avoid-anonymous-parameter"
# $Evidence is a task-owned directory outside either checkout.
$env:npm_config_prefix = "$Evidence\npm-prefix"
$env:npm_config_save = "false"
$env:npm_config_ignore_scripts = "true"
$env:npm_config_legacy_peer_deps = "true"
$env:npm_config_offline = "true"
$env:npm_config_audit = "false"
$env:npm_config_fund = "false"

mise exec -- pnpm --dir packages\typespec-lintdiff specs:typespec `
  --specs-repo $Specs --filter developerhub --limit 1 --concurrency 1
mise exec -- pnpm --dir packages\typespec-lintdiff specs:typespec `
  --specs-repo $Specs --concurrency 6
```

Archive the full result before switching the rule module, then repeat for the
other mode. No extra `--` precedes `specs:typespec` options. The supplement uses
`compare --specs-repo $Specs --type data-plane --filter specification/widget/data-plane/WidgetAnalytics --limit 1 --concurrency 1 --output <external-directory>`.
Focused fixtures use the existing `validate --rule AvoidAnonymousParameter`
command with the verified validator/common-types sources.

The coordinating session retains `corpus-recovery/baseline` and `patched`,
each with 1,348 archived reports, shards, raw outputs and an SHA-256 manifest;
`overlay-state.json` records original/active installed-file hashes.
`comparison-summary.json`, `baseline-native-contexts.json`,
`patched-native-contexts.json`, `historical-gap-excerpts.json`, and
`emission-matrix.json` preserve machine-readable identities, errors, source
excerpts, and actual schema results. The supplemental projection and both
data-plane reports are retained alongside them.

The cleanup baseline digest is
`664e13c7ecbcaef70ce49dd9dfbc3f6f89bab36bd23d3d2c258f86b4203a0b81`.
Generated canonical corpus files are validation artifacts, not part of this
rule PR. Installed-rule overlays and task-owned links were restored/removed.
The reviewed cleanup plan
`c46e5bcdccbce075285e5485bd35aad93453ea6014c45cfcc47e1a58417e3993`
restored 604 original outputs and deleted 344 individually named new outputs.
The helper verified the complete original inventory and completed successfully
at `2026-09-20T19:15:57.5411386+08:00`. Its plan, archives, journal, and six
temporary research scripts are retained outside the checkout.

## Final conclusion

The official template-request-body extension satisfies the selected native
contract and preserves the observed real-service diagnostic population.
**It is not functionally equal to the entire Swagger rule.** Five real-service
dictionary findings remain intentionally outside that contract, while the
official rule has broader pre-existing nested-model/union coverage. No observed
one-sided project is left semantically unexplained; unknown old-report project
identities, six compilation exclusions, the frozen dependency profile, and the
absence of a positive corpus instance limit the conclusion. Equal baseline and
patched counts demonstrate observational stability, not universal equivalence.
