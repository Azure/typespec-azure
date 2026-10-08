# ListInOperationName migration

## Conclusion

The updated `tsp-lintdiff-local-linter/list-in-operation-name` rule is
functionally equivalent to the Swagger `ListInOperationName` rule over the
assessed population and the closed fixture matrix.

**TypeSpec rule update required:** yes. The previous implementation checked the
TypeSpec operation name instead of the emitted AutoRest `operationId`, treated
all `@pageItems` operations as pageable, and did not recover inherited `@list`
metadata. It therefore missed emitted names such as `Operations_Get` and
reported internal ARM template instances.

The production rule and fixtures were updated to:

- resolve explicit and AutoRest-computed operation IDs, including client names,
  client locations, interfaces, and namespaces;
- recognize explicit `x-ms-pageable`, emitted pageable responses with a next
  link, and the validator's `value`-array response heuristic;
- apply those checks only to GET and POST operations, matching the validator's
  JSONPath scope;
- traverse inherited operations for `@list` metadata;
- ignore internal top-level template instances while retaining authored
  interface operations; and
- report inherited library operations on the authored interface.

No additional production-rule changes are required by the final corpus
results. Six projects did not compile and remain explicit dataset uncertainty.

## Evidence revisions and populations

| Evidence                                                              | Revision/population                                                                                                                                                                                                          | Meaning                                                                                                     |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [`docs/coverage_old.md`](../../../docs/coverage_old.md)               | Local snapshot of [external gist](https://gist.github.com/catalinaperalta/b2e7d29a33b4b451bcfcc87e8314565a); 450 compiled projects, 210 validator rules. The snapshot does not record a generation date or generator commit. | Credits local and official coverage, not necessarily same-project observed diagnostics.                     |
| [`specs/coverage-breakdown.md`](../../../specs/coverage-breakdown.md) | Specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`; full run generated `2026-09-02T09:13:40.666Z`; 468 selected, 462 compiled, 6 failed, 215 known validator rules.                                                     | Compares selected-version validator findings with diagnostics from successfully compiled TypeSpec projects. |
| Validator implementation                                              | `Azure/azure-openapi-validator` checkout `a970d991d2785184d2786b85e0a345dc3f37bc25`                                                                                                                                          | Source behavior used for fixture and corpus comparison.                                                     |
| TypeSpec base                                                         | `origin/feature/lintdiff-migration-new` at `e1e79db864fe17acb5bbbe3b3eb33fb5857c737d`                                                                                                                                        | Base for the migrated-rule change.                                                                          |

Both ARM and data-plane services are in scope. The retained Swagger side uses
the dataset-selected latest API version. Ordinary TypeSpec linting visits all
declared operations, including declarations removed from that selected version
and client-generator-only override operations; those diagnostics are attributed
below rather than treated as Swagger semantic gaps.

The failed projects were:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

They were excluded from both sides of the behavioral comparison. The retained
all-version validator shard contains one `ListInOperationName` finding for
Device Provisioning Services and 166 for Network, so the compile failures are
not silently treated as covered.

## Report reconciliation

| Report                      | Category                 | Validator projects | Local TypeSpec projects | Official projects |        Overlap |      Validator-only |       TypeSpec-only |                  Diagnostics |
| --------------------------- | ------------------------ | -----------------: | ----------------------: | ----------------: | -------------: | ------------------: | ------------------: | ---------------------------: |
| External snapshot           | 80-99% coverage / `lint` |                 52 |                      46 |                 0 | Aggregate only | Not reconstructable | Not reconstructable |                 Not reported |
| Final lint-diff run         | `production` / `partial` |                 53 |                      57 |                 0 |             53 |                   0 |                   4 | 172 validator / 213 TypeSpec |
| Final attributed comparison | `production` / `partial` |                 53 |                      53 |                 0 |             53 |                   0 |                   0 |                    172 / 172 |

The report differences have concrete causes:

1. **Different snapshots and populations.** The external snapshot has 450
   compiled projects and 210 rules; the final lint-diff run has 462 compiled
   projects and 215 rules at the pinned specs commit.
2. **Different coverage definitions.** The external snapshot's `46` is an
   aggregate local-lint coverage count. It does not provide per-project results,
   so its six unmatched projects cannot be reconstructed by subtraction. The
   lint-diff report requires observed same-project overlap.
3. **Rule semantics changed.** The corrected emitted-operation-ID and inherited
   list handling covers all 53 assessable validator projects, including Hybrid
   Kubernetes and Solutions.
4. **Different API-version and reachability populations.** The raw TypeSpec
   count includes 39 client-generator-only override declarations and two
   operations removed from the selected latest API version. None exists in the
   compared emitted Swagger.

## Project-set comparison

The final aligned population has 53 validator projects and 53 attributable
TypeSpec projects, with complete overlap and no one-sided projects.

The raw TypeSpec-only projects were:

- `specification/cdn/resource-manager/Microsoft.Cdn/Cdn`
- `specification/databoxedge/resource-manager/Microsoft.DataBoxEdge/DataBoxEdge`
- `specification/netapp/resource-manager/Microsoft.NetApp/NetApp`
- `specification/search/resource-manager/Microsoft.Search/Search`

CDN and NetApp each contribute one operation removed from the selected API
version. Data Box Edge contributes 13 SDK override declarations and Search
contributes seven. After those non-emitted declarations are excluded, the
TypeSpec-only set is empty.

## Diagnostic cardinality

The conservative identities are:

- validator raw identity: project + Swagger file + JSON path;
- validator file-independent identity: project + JSON path; and
- TypeSpec source identity: project + source file + line + column.

| Population                              | Validator raw | Validator raw identity | Validator file-independent | TypeSpec raw | TypeSpec source identity |
| --------------------------------------- | ------------: | ---------------------: | -------------------------: | -----------: | -----------------------: |
| Successful projects, before attribution |           172 |                    172 |                        172 |          213 |                      213 |
| Selected-version emitted operations     |           172 |                    172 |                        172 |          172 |                      172 |

Before attribution, 49 of 57 TypeSpec-firing projects had equal counts, no
project had more validator findings, and eight projects had 41 additional
TypeSpec findings. The positive differences were:

| Project                  | Validator | TypeSpec | Cause                                     |
| ------------------------ | --------: | -------: | ----------------------------------------- |
| Data Box Edge            |         0 |       13 | SDK-only override operations              |
| App Service              |        41 |       50 | 9 SDK-only override operations            |
| Recovery Services Backup |         1 |        8 | 7 SDK-only override operations            |
| Search                   |         0 |        7 | SDK-only override operations              |
| Guest Configuration      |         2 |        4 | 2 SDK-only override operations            |
| Cognitive Services       |         2 |        3 | 1 SDK-only override operation             |
| CDN                      |         0 |        1 | Operation removed before selected version |
| NetApp                   |         0 |        1 | Operation removed before selected version |

Thus the total positive TypeSpec difference is 41 and the total positive
validator difference is zero. Excluding 39 non-emitted SDK overrides and two
older-version operations yields equal counts in all 53 overlapping projects.
Raw count equality is not the migration criterion, but the attributed equality
corroborates the semantic and project-set evidence.

## Emission and fixture matrix

| Authored shape                                                              | Emitted field/branch                                                             | Expected result                       | Fixture                                 |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------- |
| POST with explicit `@extension("x-ms-pageable", ...)`                       | Explicit `x-ms-pageable`; POST is in validator scope                             | Violation for a non-list operation ID | `explicit-pageable-extension-violation` |
| `@list` with `@pageItems` and `@nextLink` using a non-`value` item property | AutoRest pageable branch emits `x-ms-pageable`                                   | Violation                             | `alternate-items-with-next-link`        |
| `@list` with `@pageItems` but no next link                                  | No emitted `x-ms-pageable`; no `value` array                                     | Compliant                             | `alternate-items-without-next-link`     |
| Response model has a `value` array and at most two properties               | Validator response-schema heuristic                                              | Violation                             | `emitted-operation-id-violation`        |
| Response model has a `value` array and three properties                     | Outside validator response-schema heuristic                                      | Compliant                             | `extra-collection-properties-compliant` |
| PUT response model has a `value` array                                      | PUT is outside validator JSONPath scope                                          | Compliant                             | `put-value-array-compliant`             |
| Explicit emitted operation ID is `Widgets_GetConfigs`                       | Explicit `@operationId`                                                          | Violation                             | `emitted-operation-id-violation`        |
| Explicit emitted operation ID is `Widgets_ListConfigs`                      | Explicit `@operationId`                                                          | Compliant                             | `emitted-operation-id-compliant`        |
| Interface grouping emits `Widgets_ListWidgets`                              | AutoRest interface grouping                                                      | Compliant                             | `grouped-list-compliant`                |
| Root operation emits `ListWidgets`                                          | Root operation ID; validator regex accepts only exact root `List`                | Violation                             | `root-list-prefix-violation`            |
| `@@clientName(..., "Get")` emits `Widgets_Get`                              | AutoRest client-name override                                                    | Violation                             | `client-name-violation`                 |
| Legacy inherited `@list` plus client name emits `Operations_Get`            | Inherited list metadata and authored-interface diagnostic target                 | Violation                             | `inherited-client-name-violation`       |
| Standard ARM list template plus authored custom operation                   | Template instance is compliant and ignored; authored custom operation is checked | One intended violation only           | `compliant-with-template`               |

The matrix covers GET/POST verb selection, excluded verbs, the explicit
extension, pageable-emission, response-schema, operation-ID resolution,
inheritance, diagnostic-target, and template-filter branches used by the
implementation.

## Code-backed gap examples

### Gap example: inherited AutoRest operation ID

- **Classification:** validator-only
- **Status:** fixed
- **Project/API version:** `HybridKubernetes` / `2026-05-01`
- **Source:** `main.tsp:66` and `back-compatible.tsp:36`

**TypeSpec source**

```typespec
interface Operations
  extends Azure.ResourceManager.Legacy.Operations<
      ArmResponse<OperationList>,
      Error = ErrorResponse
    > {}

@@clientLocation(Operations.list, Operations);
@@clientName(Operations.list, "Get", "!javascript");
```

**Emitted OpenAPI or validator behavior**

```json
{
  "operationId": "Operations_Get",
  "x-ms-pageable": {
    "nextLinkName": "nextLink"
  }
}
```

| Engine            | Observed result                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | Diagnostic because `Operations_Get` is pageable and does not match `Noun_List*`.                                        |
| TypeSpec lint     | Diagnostic at the authored `Operations` interface after following inherited `@list` state and resolving the emitted ID. |

**Explanation:** The old TypeSpec rule checked the inherited operation's
semantic name and did not recover the emitted client name. The operation node
also originates in library code, so targeting the authored interface is needed
for a stable visible diagnostic.

**Disposition:** Fixed by the shared AutoRest operation-ID resolver, inherited
list traversal, and authored-interface diagnostic target. The same correction
covers `Solutions.Management`.

### Gap example: SDK-only override declarations

- **Classification:** TypeSpec-only and count-only
- **Status:** population mismatch
- **Project/API version:** `DataBoxEdge` / `2023-12-01`
- **Source:** `client.tsp:74`

**TypeSpec source**

```typespec
op UsersListByDataBoxEdgeDeviceCustomized(
  ...Azure.ResourceManager.ProviderNamespace<User>,
  ...Azure.ResourceManager.CommonTypes.ApiVersionParameter,
  ...Azure.ResourceManager.CommonTypes.SubscriptionIdParameter,
  @path deviceName: string,
  @query("$filter") $filter?: string,
  ...Azure.ResourceManager.CommonTypes.ResourceGroupNameParameter,
): UserList;

@@override(
  Users.listByDataBoxEdgeDevice,
  UsersListByDataBoxEdgeDeviceCustomized,
  "python,go,javascript"
);
```

**Emitted OpenAPI or validator behavior**

```json
{
  "operationId": "Users_ListByDataBoxEdgeDevice"
}
```

The compared Swagger contains the original operation ID and no
`UsersListByDataBoxEdgeDeviceCustomized` operation.

| Engine            | Observed result                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------ |
| Swagger validator | No finding for the customization because it is not emitted as an OpenAPI operation.        |
| TypeSpec lint     | Visits the standalone SDK override declaration and reports its semantic AutoRest-style ID. |

**Explanation:** `@@override` declares an alternate SDK method shape for named
languages; it does not add a corresponding operation to the compared OpenAPI.
This cause accounts for 39 diagnostics across Data Box Edge, Search, App
Service, Recovery Services Backup, Guest Configuration, and Cognitive
Services.

**Disposition:** Excluded from the emitted-operation behavioral population. The
production lint remains useful on authored declarations and is not weakened to
hide client customization code.

### Gap example: operation removed from selected API version

- **Classification:** TypeSpec-only
- **Status:** population mismatch
- **Project/API version:** `Cdn` / selected `2026-04-01-preview`
- **Source:** `DeploymentVersion.tsp:19`

**TypeSpec source**

```typespec
@added(Versions.v2025_09_01_preview)
@removed(Versions.v2025_12_01)
@parentResource(Profile)
model DeploymentVersion is Azure.ResourceManager.ProxyResource<DeploymentVersionProperties>;
```

The `DeploymentVersions.compare` operation is part of this resource's
operations and receives a raw TypeSpec diagnostic.

**Projection/report metadata**

```json
{
  "apiVersion": "2026-04-01-preview"
}
```

| Engine            | Observed result                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Swagger validator | No diagnostic; `DeploymentVersions_Compare` is absent from the selected-version OpenAPI. |
| TypeSpec lint     | Raw diagnostic while visiting declarations from all service versions.                    |

**Explanation:** The retained Swagger is projected to a version after the
resource was removed, while ordinary lint output includes its declaration.
NetApp's `oldlistReplications`, removed at `2025-08-01`, is the second instance
of the same cause.

**Disposition:** Excluded from the selected-version comparison. No production
rule suppression is appropriate for a valid diagnostic in an older API
version.

## Remaining uncertainty

No validator-only project or unexplained count outlier remains in the 462
successfully compiled projects. The six compile failures prevent a corpus claim
for those projects, although the focused emission matrix is complete for the
rule's authorable branches. Functional equivalence therefore applies to the
assessed population and rule semantics; it does not assert raw all-version
diagnostic equality or silently cover the failed projects.
