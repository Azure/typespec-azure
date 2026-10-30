# AllResourcesMustHaveGetOperation migration

## Result and gap summary

The repaired full corpus refresh assesses 462 successfully compiled projects out of 468 and records **23
Swagger diagnostics in 11 projects versus 3 native diagnostics in 2 projects**, with one overlapping
project. Swagger associates writes and reads through emitted response definitions; the native rule
checks registered ARM lifecycle operations. Twenty Swagger findings concern response payloads without
registered native writes; three concern registered reads with different or empty response bodies.
The three native findings concern legacy GETs without registered read metadata, all present in the
selected latest versions. Conservative deduplication leaves both counts unchanged.

**Decision:** diagnostic targeting was repaired: DELETE-first split interfaces now target
`createOrUpdate`, otherwise `update`, making write-interface suppression effective. Predicate,
population, and corpus targets are unchanged; supported split interfaces are proved by regressions,
not corpus overlap. **Swagger equivalence remains partial.** Six unchanged compiler-error projects
are excluded; clean polymorphic fixture coverage remains unproven.

## Contract and official coverage gate

The guideline is RPC-Get-V1-04: a resource that can be created or updated must be readable.
The validator's effective write prerequisite is PUT or PATCH, despite its broader documentation.
DELETE-only resources are not checked.

The generic requirement is a native coverage gap on the fetched canonical
`feature/lintdiff-migration-new` at `b4fdf202afdda010789557603b571f046f0ca70c`:

- `arm-resource-operation` validates operations that exist, including required decorators; it does
  not require a missing read.
- `no-resource-delete-operation` checks DELETE, not GET.
- `arm-agent-base-type-lifecycle-operations` checks only Conversation/Response child resources of an
  Agent. It does not supply generic resource coverage.
- `TrackedResourceOperations` includes a read, but authors may compose individual standard operation
  templates. The `missing-get` and `patch-without-get` fixtures compile without errors, proving that
  templates do not structurally prevent the violation.
- The maintained ARM RPC coverage inventory explicitly identifies missing complete-operation
  enforcement under RPC006 / section 2.2.

No exact-head/base development PR or merged migration title candidate existed at the initial
coverage gate. This repair reuses the open source PR rather than duplicating that migration; the
uncovered split-interface target defect is also present in the unmerged official promotion.
The native check remains scoped to registered lifecycle roles, not a new overlapping Agent-specific
rule or a schema-shape heuristic. See [the native contract](rule.md#native-rule-contract).

## Evidence revisions and populations

- Specs: `Azure/azure-rest-api-specs`,
  `f6b53f105b95da05276530a0754a1c71b4f16397`, ARM/resource-manager dataset.
- Source baseline: `Azure/typespec-azure`,
  `b4fdf202afdda010789557603b571f046f0ca70c`.
- Source repair is based on reviewed commit `e39ac7fc2a10668f14e8160b56a69f83d4d1631d`.
  The repaired source and compiled-rule fingerprints accompany the fresh external corpus evidence.
- Validator research checkout: `6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f`.
  Focused execution uses installed `@microsoft.azure/openapi-validator-rulesets` 2.2.5.
- Swagger dataset generation: `test/harness/spec-dataset.ts`,
  `2026-08-06T08:03:27.940Z`. Its retained findings use each project's selected latest API version,
  composed native ARM validation, and no readme suppressions.
- [External coverage snapshot](../../../docs/coverage_old.md): 450 compiled projects / 210 rules;
  source gist linked in that file. Its specs revision, generation time, generator revision, and
  per-project results are not recorded, so its zero-firing row cannot identify unmatched projects.
- [Observed coverage](../../../specs/coverage-breakdown.md): the retained report includes only
  successfully compiled projects, 462 of 468. It measures same-project diagnostic overlap, not
  whether a mapping exists. The full refresh reproduces this population and the rule row.
- Repaired full TypeSpec refresh: `2026-10-09T08:12:06.318Z`, duration 1,130,742 ms, no filter or limit,
  concurrency 6, ruleset `tsp-lintdiff-local-linter/all`. The runner and its source revision are
  `test/harness/typespec-results.ts` at the source baseline above; this task does not change it.
  The existing latest-version Swagger inputs are retained, not regenerated. Ordinary native lint
  traverses source declarations; selected-version attribution for this rule is established below.
  Generated reports, shards, raw outputs, and extraction receipts are archived in the queue's
  external corpus evidence, not committed. The linked checked-in report is the retained baseline,
  not a claim that refreshed generated data is part of this PR.
- The earlier cycle-0 refresh (`2026-10-09T04:33:27.534Z`, duration 1,091,427 ms) had the same
  successful/failed project sets, rule counts, project sets, and all three source targets.
  The new full run independently re-establishes that observation after the target-selector repair.

| Report                   | Category / mode               | Validator projects | Native projects | Official credit |      Overlap |      Validator-only |         Native-only | Diagnostics  |
| ------------------------ | ----------------------------- | -----------------: | --------------: | --------------: | -----------: | ------------------: | ------------------: | ------------ |
| External snapshot        | Validator never fired, mapped |                  0 |    Not reported |    Not reported | Not reported | Not reconstructible | Not reconstructible | Not reported |
| Retained observed report | Native lint / production      |                 11 |               2 |              No |            1 |                  10 |                   1 | 23 / 3       |
| Cycle-0 full refresh     | Native lint / production      |                 11 |               2 |              No |            1 |                  10 |                   1 | 23 / 3       |
| Final full refresh       | Native lint / production      |                 11 |               2 |              No |            1 |                  10 |                   1 | 23 / 3       |

The external row receives mapping credit despite never firing; the observed report requires a
diagnostic in the same successful project. Their denominators also differ. Without the external
revision or project details, neither difference can be apportioned more precisely.

## Validator versus native semantic layer

The validator builds resource entries from direct response `$ref`s in status 200, or status 201
when no 200 response exists. It groups operations by response definition and file. It selects
resource-looking definitions with PUT/PATCH, then requires a GET returning the same definition
name. Lists whose responses wrap the resource do not satisfy that lookup. It exempts concrete
polymorphic definitions with a discriminator in their `allOf` ancestry.

The native rule consumes `getArmResources(program)`. For each registered resource with
`lifecycle.createOrUpdate` or `lifecycle.update`, it requires `lifecycle.read`. It reports once per
resource on its create/update interface, preferring create when both exist. Only when neither write
has an interface does it retain the existing lifecycle/list/action interface and model fallbacks.
It does not resolve emitted references,
predict response encoding, inspect OpenAPI extensions, or import an emitter/client-generator API.
Its existing discriminator-ancestor exemption is retained; the fixture suite documents that the
corresponding polymorphic ARM shape lacks a clean supported authoring fixture. This is a test
limitation, not proof of universal polymorphic parity.

### Research shape matrix

| Authored shape                                     | Support / native decision                                             | Selected Swagger response identity            | Swagger                                       | Native                           | Evidence                                                   |
| -------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------- | -------------------------------- | ---------------------------------------------------------- |
| Standard tracked PUT, no read                      | Supported; write and missing read                                     | PUT references resource, no matching GET      | Warning                                       | One warning                      | `missing-get`                                              |
| Standard PATCH only, no read                       | Supported; update and missing read                                    | PATCH references resource, no matching GET    | Warning                                       | One warning                      | `patch-without-get`                                        |
| Nested standard resource write, no read            | Supported; same lifecycle predicate                                   | Child response reference, no matching GET     | Warning                                       | One warning                      | `nested-missing-get`                                       |
| Standard writes and read                           | Supported; read present                                               | Same resource definition on GET               | None                                          | None                             | `has-get`; native documentation example                    |
| DELETE only                                        | Supported; no write prerequisite                                      | No PUT/PATCH resource entry                   | None                                          | None                             | `delete-only-no-get`                                       |
| Write and collection list only                     | Supported; list is not read                                           | List wrapper is not the resource definition   | Warning                                       | One warning                      | Native list-versus-read test; validator `ArmHelper` lookup |
| Registered read with array or empty response       | Customized converted surface; response-conformance policy is separate | No direct resource response reference on GET  | Warning                                       | None                             | ProviderHub, SQL, Web examples below                       |
| Plain/legacy converted response model on PUT/PATCH | Outside native resource/lifecycle contract                            | Definition selected from response             | Warning when no matching GET reference exists | None                             | Confluent and other converted cases below                  |
| Legacy read plus standard write                    | Converted legacy surface, not ordinary standard-template authoring    | GET references same response resource         | None                                          | Warning: missing registered read | ContainerApps examples below                               |
| Concrete polymorphic resource                      | Clean supported authoring not established                             | Discriminator in ancestor `allOf` excludes it | Exempt                                        | Ancestor exemption retained      | Validator source and documented fixture limitation         |

This matrix is research evidence, not an instruction to reproduce emitter branches.

## Project-level discrepancies

The refreshed comparison uses the retained validator shard's 23 unique project/file/definition findings. Twenty concern
response models with no corresponding registered native write lifecycle; three have a registered
read whose response does not reference the written definition. This is a native scope limitation,
not a claim that every validator finding is a false positive.

| Project (under `specification/`)                                                | Validator targets                                                                                                                                                                                                                | Native-scope explanation                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `advisor/resource-manager/Microsoft.Advisor/Advisor`                            | `ConfigData`                                                                                                                                                                                                                     | `models.tsp` extends `Foundations.Resource`, while `routes.tsp` supplies handwritten PUTs rather than registered resource lifecycle operations.                                                                                            |
| `apimanagement/resource-manager/Microsoft.ApiManagement/ApiManagement`          | `RecipientEmailContract`, `RecipientUserContract`                                                                                                                                                                                | CommonTypes response models and legacy routed notification recipient operations are not separate registered lifecycle resources.                                                                                                           |
| `automation/Automation.Management`                                              | `SourceControlSyncJob`                                                                                                                                                                                                           | Plain response model; creation uses a PUT override on `ArmResourceRead<SourceControl>`, and GET returns `SourceControlSyncJobById`.                                                                                                        |
| `confluent/resource-manager/Microsoft.Confluent/Confluent`                      | `ConfluentAgreementResource`                                                                                                                                                                                                     | Plain agreement response model returned from `ArmProviderActionSync`, not a resource write.                                                                                                                                                |
| `datadog/resource-manager/Microsoft.Datadog/Datadog`                            | `DatadogAgreementResource`                                                                                                                                                                                                       | Plain agreement response model and provider-level action, not a registered resource lifecycle write.                                                                                                                                       |
| `keyvault/resource-manager/Microsoft.KeyVault/KeyVault`                         | `VaultAccessPolicyParameters`                                                                                                                                                                                                    | Access-policy operation payload, not a separate registered lifecycle resource.                                                                                                                                                             |
| `providerhub/ProviderHub.Management`                                            | `OperationsPutContent`                                                                                                                                                                                                           | Registered read returns `OperationsDefinition[]`, not `OperationsPutContent`.                                                                                                                                                              |
| `recoveryservices/resource-manager/Microsoft.RecoveryServices/RecoveryServices` | `VaultCertificateResponse`                                                                                                                                                                                                       | Plain certificate response returned by an operation registered against `Vault`, not a separate certificate lifecycle resource.                                                                                                             |
| `resources/resource-manager/Microsoft.Resources/resources`                      | `TagDetails`, `TagValue`                                                                                                                                                                                                         | Plain tag response models and handwritten routes, not registered resource lifecycle writes.                                                                                                                                                |
| `sql/resource-manager/Microsoft.Sql/SQL`                                        | `ImportExportExtensionsOperationResult`, `DataMaskingRule`                                                                                                                                                                       | Import/export has a registered read with `OkResponse`; data masking rule is a CommonTypes response payload of a parent-policy action.                                                                                                      |
| `web/resource-manager/Microsoft.Web/AppService`                                 | `VnetRoute`, `StringDictionary`, `SiteAuthSettings`, `AzureStoragePropertyDictionaryResource`, `BackupRequest`, `ConnectionStringDictionary`, `PushSettings`, `KeyInfo`, `StorageMigrationResponse`, `StaticSiteUserARMResource` | `VnetRoute` has an array-returning registered read. Remaining targets are plain/ProxyOnlyResource converted response models used by configuration, secret, migration, or user actions, not separate registered native lifecycle resources. |

The **complete validator-only set** (under `specification/`) is:

- `advisor/resource-manager/Microsoft.Advisor/Advisor`
- `apimanagement/resource-manager/Microsoft.ApiManagement/ApiManagement`
- `automation/Automation.Management`
- `confluent/resource-manager/Microsoft.Confluent/Confluent`
- `datadog/resource-manager/Microsoft.Datadog/Datadog`
- `keyvault/resource-manager/Microsoft.KeyVault/KeyVault`
- `providerhub/ProviderHub.Management`
- `resources/resource-manager/Microsoft.Resources/resources`
- `sql/resource-manager/Microsoft.Sql/SQL`
- `web/resource-manager/Microsoft.Web/AppService`

The **complete native-only set** is
`specification/app/resource-manager/Microsoft.App/ContainerApps`.
The **overlap set** contains only
`specification/recoveryservices/resource-manager/Microsoft.RecoveryServices/RecoveryServices`.
Both engines report there, but on different targets: `VaultCertificateResponse` and `Vault`.
No validator finding for this rule belongs to an excluded compile-failure project.

### Raw cardinality, conservative deduplication, and outliers

| Identity                                 |      Validator |         Native |
| ---------------------------------------- | -------------: | -------------: |
| Raw diagnostics over successful projects |             23 |              3 |
| Project + Swagger file + JSON path       |             23 | Not applicable |
| Project + JSON path (file-independent)   |             23 | Not applicable |
| Project + source file + line + column    | Not applicable |              3 |

Independent per-project grouping reproduces the aggregate rule row. There are no repeated
validator paths to collapse. The three native source identities are `DaprComponent.tsp:76:11`,
`HttpRouteConfig.tsp:60:11` (ContainerApps), and `Vault.tsp:155:11` (RecoveryServices).
These remain different identity domains; no cross-engine canonical target mapping is asserted.

| Project suffix (same roots as above) | Selected API version | Validator | Native | Native − validator |
| ------------------------------------ | -------------------- | --------: | -----: | -----------------: |
| Advisor                              | `2026-03-01-preview` |         1 |      0 |                 −1 |
| ApiManagement                        | `2025-09-01-preview` |         2 |      0 |                 −2 |
| ContainerApps                        | `2026-01-01`         |         0 |      2 |                 +2 |
| Automation.Management                | `2024-10-23`         |         1 |      0 |                 −1 |
| Confluent                            | `2026-06-02-preview` |         1 |      0 |                 −1 |
| Datadog                              | `2025-12-26-preview` |         1 |      0 |                 −1 |
| KeyVault                             | `2026-03-01-preview` |         1 |      0 |                 −1 |
| ProviderHub.Management               | `2024-09-01`         |         1 |      0 |                 −1 |
| RecoveryServices                     | `2026-05-31-preview` |         1 |      1 |                  0 |
| resources                            | `2025-04-01`         |         2 |      0 |                 −2 |
| SQL                                  | `2025-02-01-preview` |         2 |      0 |                 −2 |
| AppService                           | `2026-07-15`         |        10 |      0 |                −10 |

Over the 12 affected projects, one has equal counts, ten have higher validator counts, and one has
higher native counts. The total positive validator excess is 22; the positive native excess is 2,
not merely a net difference of 20. Web is the largest validator-higher outlier: nine converted
response payloads and one array-returning read. ContainerApps is the native-higher outlier: two
legacy-read metadata cases. RecoveryServices illustrates why equal counts do not establish
target equivalence. The source-shape inventory above and code-backed examples below explain the
material categories; no emitted-duplicate or older-only explanation is needed.

### Gap example: response payload is not a native resource lifecycle

- **Classification:** validator-only.
- **Status:** intentional native scope limitation, not proven Swagger compliance.
- **Project/API version:** Confluent / `2026-06-02-preview`.
- **Source:** `Microsoft.Confluent/Confluent/routes.tsp`, `MarketplaceAgreementsOperationGroup.create`;
  `models.tsp`, `ConfluentAgreementResource`.

Relevant authored operation (the model is a plain `model ConfluentAgreementResource`):

```typespec
@summary("Create Confluent Marketplace agreement in the subscription.")
@autoRoute
@put
@action("agreements/default")
create is ArmProviderActionSync<
  Request = ConfluentAgreementResource,
  Response = ConfluentAgreementResource,
  Scope = SubscriptionActionScope,
  Parameters = {},
  OptionalRequestBody = true,
  Error = ResourceProviderDefaultErrorResponse
>;
```

The selected write response is:

```json
{ "$ref": "#/definitions/ConfluentAgreementResource" }
```

| Engine  | Observed result                                                                                             |
| ------- | ----------------------------------------------------------------------------------------------------------- |
| Swagger | One warning on `definitions.ConfluentAgreementResource`; no GET directly returns that definition.           |
| Native  | No warning; provider actions and plain response models do not create a registered resource write lifecycle. |

**Disposition:** do not infer ARM resource identity from envelope properties or generated references.
The 20 response-payload cases remain outside the native contract, with their source forms listed
above; they are not universally covered by this rule.

### Gap example: read exists but its response is an array

- **Classification:** validator-only.
- **Status:** intentional response-identity difference.
- **Project/API version:** ProviderHub / `2024-09-01`.
- **Source:** `ProviderHub.Management/OperationsPutContent.tsp`,
  `OperationsPutContents.listByProviderRegistration`.

```typespec
listByProviderRegistration is ArmResourceRead<
  OperationsPutContent,
  Response = ArmResponse<OperationsDefinition[]>
>;
```

The GET 200 response is:

```json
{
  "type": "array",
  "items": { "$ref": "#/definitions/OperationsDefinition" }
}
```

| Engine  | Observed result                                                                              |
| ------- | -------------------------------------------------------------------------------------------- |
| Swagger | Warns on `OperationsPutContent`; an array is not a direct `$ref` to that written definition. |
| Native  | No warning; the resource has a registered read lifecycle.                                    |

**Disposition:** resource-response conformance belongs to the existing
`arm-resource-operation-response` rule. Do not simulate response encoding to decide whether a read
exists. Web's `VnetRoute` read has the same array category, with `items` referencing `VnetRoute`.

### Gap example: read exists with an empty response

- **Classification:** validator-only.
- **Status:** intentional response-identity difference; separate response-body policy is suppressed.
- **Project/API version:** SQL / `2025-02-01-preview`.
- **Source:** `ImportExportExtensionsOperationResult.tsp`,
  `ImportExportExtensionsOperationResults.get`.

```typespec
#suppress "@azure-tools/typespec-azure-resource-manager/no-response-body" "FIXME: Update justification, follow aka.ms/tsp/conversion-fix for details"
@tag("DatabaseExtensions")
get is ArmResourceRead<
  ImportExportExtensionsOperationResult,
  Response = OkResponse
>;
```

Its GET 200 response has no `schema`; the write's response references
`#/definitions/ImportExportExtensionsOperationResult`.

| Engine  | Observed result                                                                   |
| ------- | --------------------------------------------------------------------------------- |
| Swagger | Warns because there is no GET response reference matching the written definition. |
| Native  | No warning because the read lifecycle is registered.                              |

**Disposition:** do not turn suppressed response-body nonconformance into missing-read semantics.

### Gap example: legacy GET lacks native read lifecycle metadata

- **Classification:** TypeSpec-only in ContainerApps; same-project but different-target in RecoveryServices.
- **Status:** intentional converted-legacy metadata limitation.
- **Project/API version:** ContainerApps / `2026-01-01`; RecoveryServices / `2026-05-31-preview`.
- **Source:** `DaprComponent.tsp`, `ConnectedEnvironmentsDaprComponents`.

```typespec
get is DaprComponentCustomErrorOps.Read<DaprComponent>;
createOrUpdate is ArmResourceCreateOrReplaceAsync<DaprComponent>;
```

The legacy `Read` template applies `@get`, `@readsResource(Resource)`, and
`@legacyResourceOperation(Resource, "read", OverrideResourceName)`, but not `@armResourceRead`.
The standard write registers the native lifecycle.

| Engine  | Observed result                                                                           |
| ------- | ----------------------------------------------------------------------------------------- |
| Swagger | No missing-GET warning for `DaprComponent`: the HTTP GET returns the resource definition. |
| Native  | Warns on `ConnectedEnvironmentsDaprComponents` because `lifecycle.read` is absent.        |

`HttpRouteConfig` has the same legacy-read/standard-update combination. RecoveryServices' `Vault`
has a legacy `VaultOps.Read<Vault>` with standard native writes. Its validator diagnostic instead
targets `VaultCertificateResponse`; project overlap does not imply matching violations.

**Disposition:** preserve the native metadata contract; authors should use the standard read
template. No route matching, legacy-marker scraping, or emitter dependency is added.

### Latest-version attribution

All three freshly observed native diagnostics concern the selected latest API version, not only historical
versions. The ContainerApps latest output defines both `DaprComponent` and `HttpRouteConfig` and
includes their GET and PUT operations; `HttpRouteConfig` also has PATCH. The RecoveryServices latest
output defines `Vault` and includes its GET, PUT, and PATCH. The corresponding authored standard
write/update declarations shown above have no older-only version condition.

For example, the selected ContainerApps output records:

```json
{
  "operationId": "HttpRouteConfig_Get",
  "responses": {
    "200": { "schema": { "$ref": "#/definitions/HttpRouteConfig" } }
  }
}
```

The same selected file contains `HttpRouteConfig_CreateOrUpdate` and `HttpRouteConfig_Update`
returning that definition. Source metadata explains the missing native read independently of
version projection. Therefore **zero of these three diagnostics are excluded as older-version-only**.
This attribution is local to these targets, not a claim that the full runner projects every lint.

## Validation and final conclusion

Native unit tests compile without an emitter and validate fifteen cases, including the exact
published incorrect/correct documentation snippets. The test host registers the OpenAPI library
only as a transitive ARM/Core prerequisite; the snippets do not use its decorators.

### Split-interface diagnostic regression

Supported standard templates can register DELETE first on `Deletes`, then a create or update on
`Writes`, with no read. Before repair, four exact-target regressions fail because the selector uses
the first lifecycle interface, and two full-linter tests fail because suppression on `Writes` leaves
the warning. The existing nine cases pass. After repair, all fifteen cases pass. The full-linter
tests compile create-only and update-only inputs under three conditions each: no suppression gives
one warning, suppression on `Writes` gives none, and suppression on `Deletes` still gives one.
They validate all compiler diagnostics, not only a filtered target-rule result, and use no private
metadata injection.

```typespec
@armResourceOperations
interface Deletes {
  delete is ArmResourceDeleteSync<Widget>;
}
@armResourceOperations
interface Writes {
  createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
}
```

This native target defect does not change the missing-read predicate or establish any new Swagger
equivalence. The create-over-update regression also registers update first on a separate interface,
proving the preference is semantic rather than declaration order.

Focused strict comparison validates five fixtures: three violations and two compliant controls,
all existing snapshots matching. The controls' unrelated common-types-version, description,
examples, and path-length diagnostics are explicitly reviewed by code/count, rather than falsely
reported as warning-free.

The affected `ParametersInPointGet` group also validates its one fixture. The complete affected
`XmsResourceInPutResponse` group validates all seven fixtures after an explicitly authorized narrow
baseline correction: `global-put-ignored` no longer expects `put-in-operation-name` on the global
`globalPut` operation outside the ARM service. Only that stale code/count expectation and matching
diagnostic snapshot entry were removed; the unrelated production rule was not changed. The original
failed receipt and passing corrective whole-group receipt are preserved externally.

The supplemental `audit:noise` run completed all 238 selected violation cases, but is not evidence
of local-rule coverage: `analyze-noise.ts` omits the fourth worker argument, while `compile-worker.ts`
enables the local rules only when that argument is `"true"`. It consequently reports zero diagnostics
for this rule's `missing-get` case under the official-only ruleset. In contrast, `validate.ts` supplies
the local-enable argument and the strict focused run observes the expected warning. This pre-existing
audit invocation defect is disclosed, not repaired or retried in this rule change.

The literal representative filter `Microsoft.RecoveryServices/RecoveryServices` selected and
successfully processed **two**, not one, projects: RecoveryServices and RecoveryServicesBackup.
The subsequent required full run completed with exit 0 and processed all 468 projects; 462 compiled
successfully and six failed with compiler errors. The repaired full run completed at
`2026-10-09T16:14:36.7258733+08:00`. Both engines' behavioral comparison excludes
those six projects, rather than treating them as compliant or counting their partial diagnostics.

| Excluded project (under `specification/`)                                                  | Observed compiler error                                                       |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices` | `@typespec/http/duplicate-body`, including `client.tsp:469:57`                |
| `monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`                  | `@typespec/http/missing-uri-param` in legacy operation routes                 |
| `network/resource-manager/Microsoft.Network/Network/Network`                               | `@typespec/http/missing-uri-param` for `applicationGatewayAvailableSslOption` |
| `quota/resource-manager/Microsoft.Quota/Quota`                                             | `@typespec/http/missing-uri-param` for subscription/resource-group parameters |
| `resources/resource-manager/Microsoft.Resources/deployments`                               | `@typespec/http/duplicate-body` in legacy operation parameters                |
| `servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`                     | `@typespec/http/duplicate-body`, including `client.tsp:195:31`                |

Their project identities match the retained failed population. They have no Swagger findings for
this rule; exclusion therefore removes zero validator findings, but leaves their native behavior
unassessed. Exact command errors, diagnostic excerpts, raw-output paths, and aggregation inputs
remain in machine-readable external evidence. These are corpus limitations, not task-introduced
test failures, and no failed project was retried or silently discarded.

**Required changes:** prioritize the registered create/update interface in the production target
selector. Add DELETE-first split-interface create/update and create-over-update target regressions,
plus full-linter suppression controls. Preserve the reviewed compliant fixtures' ambient expectations
and existing predicate behavior.
The native operation-set contract is established for the tested supported standard-template shapes.
The migrated rule is **not functionally equal to the full executable Swagger rule**: unregistered
converted response models, customized read responses, and legacy read roles intentionally differ
from the native contract. The polymorphic shape remains unproven by a clean supported fixture.
Explained observational counts do not close that limitation or establish universal equivalence.
