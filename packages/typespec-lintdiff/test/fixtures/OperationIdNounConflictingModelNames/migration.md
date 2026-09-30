# OperationIdNounConflictingModelNames: native operation-group guideline

## Result and gap summary

**Native redesign and review fixes complete; independent precommit review passed; GitHub review pending.**
The final 468-project run has 462 assessable projects: **487 Swagger findings in
55 projects versus 131 native findings in 58**, with 54-project overlap.
Swagger reports per operation, including 362 repeated project/prefix labels.
Native reports once per common SDK group. Three serialized-only labels disappear;
nine native-only labels comprise three historical-version findings, three
referenced types absent from local Swagger definitions, one common group override,
and two exact-case differences.
The unused-sibling fix removes DevOpsInfrastructure `Sku` and DataFactory
`PrivateEndpointConnection` false positives. All unmatched labels and one-sided
projects are explained. Six compiler-failed projects are excluded.
Latest-version attribution covers unmatched findings; it is not a projected rerun
of the native rule.
**No further rule update is required for these gaps.** The approved native
guideline is deliberately **not functionally equivalent** to the Swagger rule.

## Native rule contract

`no-operation-group-name-conflict` belongs in client-generator-core because its
subject is common SDK client APIs. Within each root client, compare every subclient
group's complete common SDK name with named types reachable from the parameters
and return types of that client's operations. Names are case-sensitive. Common
client names and client locations apply; exclusively emitter/language-scoped
overrides do not. TCGC stores a negated scope's default under `AllScopes`, so the
common fallback of `!javascript` applies without selecting JavaScript or any
other language. This is the existing supported metadata contract, not a
rule-owned interpretation of decorator syntax.
Root methods, even `Widget_Read`, do not create a group.

Groups come from supported `listClients`, `listSubClients` and
`listOperationsInClient` traversal, including explicit clients, interface and
namespace groups, virtual string locations and typed relocations. An explicitly
named `@client` participates under that name; common `@clientName` overrides it.
Parent groups also participate when only their subgroups contain methods.
Different root clients are separate comparison populations.

The compiler's supported `navigateType` visits each parameter/return graph,
including unions, scalars, enums and tuples. The model listener follows properties,
indexer values, and base names/members without expanding a base's other subtypes.
A directly referenced model with `@discriminator` includes the alternatives
resolved by `getDiscriminatedUnionFromInheritance`. Invalid discriminator graphs
are already diagnosed by the compiler and are not interpreted as valid alternatives.
Named user models, scalars, enums and unions are candidates regardless of their
declaration namespace. Shared or imported types participate when referenced.
Compiler standard types, unnamed anonymous shapes and unused declarations do not
contribute candidate names. Named children of anonymous shapes still participate.
The shared TCGC `getLibraryName` supplies common overrides, friendly names and
concrete template names. No generated-reference, inlining, ARM common-type or
legacy external-reference predicates remain.

One diagnostic is reported per conflicting group, not per method, model
occurrence or matching declaration. A declared group targets its interface or
namespace; virtual/merged groups without a declaration target their first
operation. Distinct groups sharing the same spelling each receive a warning.
Compiler traversal and discriminator resolution are reused; the model listener
owns the inheritance reachability boundary. A per-client visited set avoids
cycles and repeated collection without confusing an inherited base with a later
direct API reference to that base.

The model listener checks the supported `isInScope` API before following each
property, including inherited properties and operation parameters. Language-only
members therefore cannot introduce candidate types into the common API.
An `EnumMember` reference contributes its owning enum's common name. For a
`UnionVariant`, the public `getClientType` classification determines whether the
common SDK retains an enum owner. The rule adds that owner's name without walking
its other alternatives; otherwise only the selected variant value is followed.
This also handles enum members nested inside non-enum union variants. A subsequent
reference to the whole union still visits its alternatives normally. The rule
does not reproduce SDK enum-flattening or nullable-wrapper decisions.
Classification uses a separate non-mutating common-scope TCGC context: the SDK
helper constructs every alternative and allocates template names, which must not
change names collected from the reachable API. No classification SDK object or
naming cache is shared with client traversal or `getLibraryName`.

### API prior art and the common-scope enhancement

The official `get-operation-name` rule uses a non-mutating TCGC context and
`getLibraryName(..., AllScopes)` rather than an emitter's naming domain.
The current client traversal API, however, had no equivalent common-scope option:
`getClientLocation` and client cache construction implicitly selected the
context's emitter. Reconstructing the hierarchy in this rule would duplicate
supported client logic.

An optional typed `scope` on `createTCGCContext` now supplies the default scope
for metadata lookup, client hierarchy, relocation and operation inclusion.
`AllScopes` selects common metadata, **not every language**. A helper's explicit
scope takes precedence; omitting the context option preserves existing emitter
selection. The emitter identity remains unchanged. The rule uses
`@azure-tools/typespec-client-generator-core`, `mutateNamespace: false`, and
`scope: AllScopes`; it neither creates a fake emitter identity nor calls an emitter.
Public context tests exercise common versus C# naming/relocation and an explicit
language scope independent of emitter identity.

The source branch's official Core/ARM implementations, linter registrations and
ARM guideline inventory contain no existing check for this native group/type
collision. This remains a native gap; the old Swagger mapping is historical only.

## Intentional migration differences

| Authored shape                                                | Native result                                   | Historical Swagger result / reason               | Evidence                                                              |
| ------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| Interface `Widget` returns model `Widget`                     | One group warning                               | Prefix/definition warning                        | `noun-conflicts-model`; native target/multiplicity tests              |
| Plural `Widgets` group returns `Widget`                       | No warning                                      | No conflict                                      | `noun-does-not-conflict`; actual doc snippets tested                  |
| Root `Widget_Read` returns `Widget`                           | No group, no warning                            | Prefix may conflict                              | Native root-operation regression; previous algorithm split root names |
| `Widget_Admin` or lowercase `widget` group with `Widget` type | No warning                                      | A prefix/casing-based approximation could differ | Full-name and case-sensitive native tests                             |
| Common group/type overrides                                   | Compare common names                            | Selected AutoRest metadata may differ            | Common positive/negative overrides; four scoped controls              |
| String or typed client relocation                             | Compare actual common group                     | Serialized grouping may differ by emitter        | Native common/scoped relocation tests; context tests                  |
| Concrete friendly-named templates                             | Compare supported common names                  | Named definitions can coincide                   | `friendly-template-collision`                                         |
| `Gizmo<"one">` without a friendly name                        | Warn for common name `Gizmo`                    | Inlined union creates no conflicting definition  | `inline-template-no-collision` emitted fixture                        |
| `Widget<Item>` without a friendly name                        | Compare common name `WidgetItem`, not `Widget`  | Inlined model creates no conflicting definition  | Same fixture; supported TCGC naming, not a custom template rule       |
| Legacy external-reference `Widget`                            | Warn for native named type                      | No local definition                              | `external-reference-no-collision` emitted fixture                     |
| Named query/header type                                       | Participate in native API                       | May not create a Swagger definition              | Native parameter/header tests                                         |
| Shared or nested named type                                   | Participate when referenced                     | Serialized qualified naming can differ           | Native shared/nested tests                                            |
| Several methods in one group                                  | One warning on group                            | One warning per serialized operation             | Native exact target/count tests                                       |
| Anonymous response with named child                           | Child participates, anonymous shape has no name | Emission naming is not the native policy         | Native anonymous/recursive graph tests                                |
| Another root client's types or unused declarations            | Not part of this client's API                   | Swagger population may differ                    | Native root-client isolation tests                                    |

Fixtures deliberately retain their original historical directory names. Their
`expect.json` violation flag describes the **validator** expectation. Two
validator-clean fixtures now have mapped native diagnostics; this is documented
contract divergence, not a reason to suppress native warnings or change the input.
All fixture snapshots are produced by the existing comparison harness.

## Validation and corpus provenance

- Source worktree: `lintdiff-operation-id-noun-conflicting-model-names`.
- Original source head: `e16db1ab337fd7022789c7437d10ee722b70480d`.
- Fetched development base: `deb8c8d4fbdd7d962e5b2ff4fd6e4b9c2cb3b168`.
- Specs pin: `f6b53f105b95da05276530a0754a1c71b4f16397`.
- Native unit tests load no emitter or OpenAPI library.
- Focused rule tests: 59 passed; TCGC context tests: nine passed.
- Complete lintdiff package suite: 20 files / 521 tests passed, including the
  rule regressions and four harness test files.
- All five historical comparison fixtures pass strict snapshot validation. Two
  validator-clean cases intentionally produce native diagnostics under the new
  guideline; their snapshots preserve that difference.
- Initial full TCGC suite: 94 files, 1,361 tests; four per-test timeouts,
  1,355 passed, two skipped. The coordinator authorized exactly one diagnostic
  rerun with `--maxWorkers=1`: all 94 files passed, with 1,359 passed and two
  skipped tests. Assertions, dependencies and timeout limits were unchanged.
  This is a recovered timeout, not proof of an environmental cause.
  That passing evidence remains applicable: all six changed TCGC source/test
  hashes and all four original configuration/lockfile fingerprints match.
- The added regressions initially reproduced three native false positives:
  unused siblings, shared-base cross-client leakage, and inherited-discriminator
  expansion. All now pass, alongside direct-reference and recursive-polymorphism
  positive controls. An intermediate build caught missing required empty
  `NavigationOptions` arguments; that build failure and its mechanical correction
  are retained in the execution evidence.
- Representative corpus: the literal `DevOpsInfrastructure` selector processed
  its one expected project successfully, with zero target-rule diagnostics.
- Full corpus: all 468 projects processed, generated
  `2026-09-30T07:50:11.898Z`, with 462 assessable and six failed projects.
  The earlier `2026-09-30T04:04:54.744Z` run contained the two false positives;
  its 133 assessable findings are superseded, not silently overwritten.
- The independent-review member-owner, scope and classification-isolation
  corrections leave all 131 assessable diagnostic records identical to the
  `2026-09-30T05:26:24.913Z` and `2026-09-30T06:50:16.598Z` runs.
  The raw totals and six failure identities/compiler-code sets are unchanged.
  All nine unmatched labels retain identical selected API versions and
  byte-identical projected HTTP graphs, revalidating the causal attribution
  below. The new defects are proved and fixed by the native regression suite;
  corpus equality alone did not reveal them.
- Scoped formatting, TypeScript lint, both package builds and post-format strict
  fixture validation passed before the documentation-only investigation update.

## Current corpus evidence and limitations

The retained Swagger inputs select the dataset's latest API version. Native
linting visits the unprojected source program and may include older declarations.
The rule is evaluated in production mode, not staging mode. Failed projects are
excluded from both sides of the assessable comparison.

| Population or identity                     |        Swagger |         Native |
| ------------------------------------------ | -------------: | -------------: |
| Raw diagnostics, including failed projects |            649 |            137 |
| Assessable diagnostics                     |            487 |            131 |
| Assessable affected projects               |             55 |             58 |
| Same-project overlap                       |             54 |             54 |
| One-sided projects                         |              1 |              4 |
| Project + Swagger file + JSON path         |            487 | Not comparable |
| Project + JSON path                        |            487 | Not comparable |
| Project + source location                  | Not comparable |            131 |

Across affected projects, ten have equal diagnostic counts, 44 are
validator-higher and five are native-higher. The positive validator excess totals
362; the positive native excess totals six. The 487 Swagger operation findings
have 125 distinct project/prefix labels; the 131 native findings have 131 distinct
project/group-name labels. Label arithmetic is `125 - 3 + 9 = 131`, but this is
descriptive, not a common semantic identity or an equivalence proof.

The complete validator-only project is
`specification/fileshares/resource-manager/Microsoft.FileShares/FileShares`
(selected `2026-06-01`, eight findings). Its explicit singular serialized
prefixes `FileShare` and `FileShareSnapshot` differ from plural authored groups.

The complete native-only project list is:

- `specification/confidentialledger/resource-manager/Microsoft.ConfidentialLedger/ConfidentialLedger`:
  `ManagedCCF`, one finding; selected `2026-05-22-preview`. The model and interface
  were removed at `v2026_02_23`, so this finding is older-version-only.
- `specification/containerservice/resource-manager/Microsoft.ContainerService/aks`:
  `OperationStatusResult`, one finding; selected `2026-05-02-preview`.
  `AgentPools.getByAgentPool` was added at that version and relocated through
  supported client metadata. It returns the shared ARM `OperationStatusResult`;
  the selected Swagger has matching operations but no local definition.
- `specification/hybridaks/resource-manager/Microsoft.HybridContainerService/HybridContainerService`:
  `HybridIdentityMetadata`, one finding; selected `2026-04-01-preview`.
  `client.tsp` applies `@clientName(..., "HybridIdentityMetadata", "!autorest")`.
  Its common fallback applies to this native rule; the excluded AutoRest scope
  retains different grouping. The selected Swagger contains the model definition
  but no operation with that prefix.
- `specification/servicefabricmanagedclusters/resource-manager/Microsoft.ServiceFabric/ServiceFabricManagedClusters`:
  `ManagedAzResiliencyStatus` and `ManagedMaintenanceWindowStatus`, two findings;
  selected `2026-05-01-preview`. Explicit serialized identifiers start with
  lowercase `managedAzResiliencyStatus` and `managedMaintenanceWindowStatus`,
  unlike the native groups and matching capitalized types.

Additional label differences in overlapping projects include ApiManagement,
ContainerApps and Batch. ContainerApps' `AppResiliency` was removed
at `v2026_01_01`; Batch certificate methods were removed at `v2025_06_01`.
ApiManagement's common `PrivateEndpointConnection` location is stored as the
fallback of `!javascript`, and its native model aliases
`PrivateEndpointConnectionResource`; the selected Swagger has no local
`PrivateEndpointConnection` definition. SecuritySolutionsAPI instead uses common
`SecuritySolutionsReferenceData` grouping with lowercase
`securitySolutionsReferenceData` model/serialized prefix, so native exact
case-sensitive names do not collide.

### Selected-version attribution of every unmatched native label

| Project / selected API version                      | Native-only label                | Explanation                                                                             |
| --------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| ApiManagement / `2025-09-01-preview`                | `PrivateEndpointConnection`      | Referenced native alias; external common-type definition                                |
| ContainerApps / `2026-01-01`                        | `AppResiliency`                  | Model and group removed at `v2026_01_01`                                                |
| Batch / `2025-06-01`                                | `Certificate`                    | All six group operations removed at `v2025_06_01`                                       |
| Batch / `2025-06-01`                                | `NetworkSecurityPerimeter`       | Reachable common type within the NSP configuration                                      |
| ConfidentialLedger / `2026-05-22-preview`           | `ManagedCCF`                     | Model and group removed at `v2026_02_23`                                                |
| AKS / `2026-05-02-preview`                          | `OperationStatusResult`          | Referenced shared type; operation added at the selected version                         |
| HybridContainerService / `2026-04-01-preview`       | `HybridIdentityMetadata`         | Common fallback of a `!autorest` name override                                          |
| ServiceFabricManagedClusters / `2026-05-01-preview` | `ManagedAzResiliencyStatus`      | Common model override matches the interface; explicit serialized prefix differs in case |
| ServiceFabricManagedClusters / `2026-05-01-preview` | `ManagedMaintenanceWindowStatus` | Same exact-case difference                                                              |

Source versioning decorators establish the three historical-only findings.
The runner's actual selected-version HTTP semantic graphs corroborate absence of
those operations and presence of all six other unmatched-label operations.
For interface diagnostic targets, the interface itself is not an HTTP graph node:
the check uses its verified operation target, not absence of the interface's
source location. This prevents incorrectly dropping the HybridAKS and ServiceFabric
findings. The graphs are comparison evidence only; the production rule never
reads them or performs unsafe version mutation.

Removing these three proven historical findings gives **128 source-attributed
native findings in 57 projects**. The latest-version one-sided investigation
therefore has one validator-only project (FileShares) and three native-only
projects (AKS, HybridContainerService, ServiceFabricManagedClusters).
This is explicitly a manual attribution of unmatched findings, not a claim that
the entire native rule was rerun on every projected program. Raw counts remain
131 assessable / 137 total. No one-sided project or unmatched label is left
unclassified, and none requires restoring serialized-prefix behavior.

## Code-backed gap examples

These are excerpts from the pinned specs and retained Swagger, not production
rule logic or recommended native authoring workarounds.

### Native review corrections: member ownership and common property scope

These are native correctness defects, not intentional Swagger differences.
Both examples use ordinary generic HTTP authoring with `using TypeSpec.Http;`,
`using Azure.ClientGenerator.Core;` and `@service namespace Example;`.

```tsp
enum Widget {
  one,
  two,
}
model Response {
  value: Widget.one;
}
namespace Groups {
  interface Widget {
    @get read(): Response;
  }
}
```

The compiler's walker skips direct `EnumMember` references. The common SDK
property instead has an enum-value type owned by `Widget`, so the group requires
one warning. An enum-like `union Widget { one: "one", two: "two" }` has the same
ownership requirement. The corrected rule retains these owners in parameters,
direct responses and nested properties. For a selected non-enum union variant,
it follows only the selected value; it does not visit unrelated alternatives.
Nullable union variants are not mistakenly treated as enum-owned references.

```tsp
model Widget {
  id: string;
}
model Response {
  @scope("csharp")
  value: Widget;

  id: string;
}
namespace Groups {
  interface Widget {
    @get read(): Response;
  }
}
```

Here `isInScope` is false for `value` under common metadata selection, and the
common SDK response exposes only `id`. The previous property walk incorrectly
reported a collision. The corrected walk applies the supported scope predicate
to own/inherited properties and operation parameters before following their
types. Common and negated-scope fallback members still participate.

The member-owner and scope expansion initially had 49 cases. Its red run reproduced 13
missing-owner or overbroad-scope assertions; all now pass, including selected
alternative isolation and later whole-union reference controls. The first
corrected build and the complete 511-test lintdiff suite passed in that draft.
The subsequent full corpus has no added or removed target-rule diagnostic
records, so these supported native shapes add test coverage without changing
the observed corpus populations.

### Classification must not allocate reachable names

Independent follow-up found that owner classification, although not adding
unselected types to the candidate set, allocated their names in the same TCGC
context used by reachable types:

```tsp
model Box<T> {
  value: T;
}
union Choice {
  unused: Box<int32>,
  selected: Box<string>,
}
namespace Groups {
  interface Box {
    @get read(): Choice.selected;
  }
}
```

The selected type's common name is `Box`. Classifying the whole union first
reserved `Box` for the unreachable integer alternative and renamed the reachable
string alternative to `Box1`, hiding the conflict. Reordering the alternatives
changed the diagnostic without changing the reachable API.

The SDK has no equivalent side-effect-free public classifier that also handles
its enum-flattening and nullable-wrapper policy. The rule therefore retains the
public classifier in a separate common-scope context with namespace mutation
disabled. Only its `kind` is consumed; all collected names, client/group
traversal and scope checks use the original context. The SDK's name, referenced
type, property, version and client caches are context-owned. Client construction
clones decorator-owned records rather than mutating shared program metadata;
SDK model construction changes new SDK objects, not compiler model properties.

Ten regressions cover both alternative orders, direct/nested selected template
types, an unrelated nested template, a later operation and a different root
client. Every case requires exactly one diagnostic on the authored `Box`
interface. Seven failed before isolation; all 59 focused tests and the complete
521-test package suite now pass. A public-API probe additionally verifies both
orders with default and explicit clients: compiler type graphs, diagnostics,
namespace identity and client metadata stay unchanged, while separate naming
contexts preserve `Box` and enum/nullable classifications remain correct.

### Per-operation versus per-group multiplicity

- **Classification/status:** count-only, intentional.
- **Project/version:** Marketplace / `2025-01-01`.
- **Source:** `Marketplace/back-compatible.tsp` and `PrivateStore.tsp`.

```tsp
@@clientLocation(PrivateStores.get, "PrivateStore");
@@clientLocation(PrivateStores.createOrUpdate, "PrivateStore");
```

`PrivateStore` is a named `ProxyResource<PrivateStoreProperties>`. The retained
GET operation includes:

```json
{
  "operationId": "PrivateStore_Get",
  "responses": {
    "200": { "schema": { "$ref": "#/definitions/PrivateStore" } }
  }
}
```

| Engine  | Observed result                                |
| ------- | ---------------------------------------------- |
| Swagger | 25 `PrivateStore_*` operation findings         |
| Native  | One warning on the actual `PrivateStore` group |

**Disposition:** retain the native group diagnostic unit. The largest
validator-higher projects show the same multiplicity: Automation 120/26,
Batch 35/8, MachineLearningServices 29/4, Marketplace 25/1, AzureLargeInstance
15/2, Billing 14/2, SQL 20/8 and Storage 15/3 (Swagger/native).
Batch's two additional native labels are separately explained in the attribution
table; they are not misclassified as duplicate operations.

### Serialized names are not native groups

- **Classification/status:** validator-only, intentional.
- **Project/version:** FileShares / `2026-06-01`.
- **Source:** `FileShares/fileshares.tsp`; other interface methods omitted.

```tsp
interface FileShareSnapshots {
  @operationId("FileShareSnapshot_Get")
  getFileShareSnapshot is ArmResourceRead<FileShareSnapshot, BaseParameters<FileShareSnapshot>>;
}
```

The selected Swagger records `"operationId": "FileShareSnapshot_Get"` and
defines `FileShareSnapshot`. Five such snapshot operations and three
`FileShare_*` operations produce eight validator warnings.

| Engine  | Observed result                                                 |
| ------- | --------------------------------------------------------------- |
| Swagger | Eight findings on singular serialized prefixes                  |
| Native  | Zero; plural authored groups do not collide with singular types |

**Disposition:** do not read operation identifiers, split names, or infer groups
from root methods. The native `Widget_Read` regression independently proves that
an underscored root operation does not invent a `Widget` group.

### Case-sensitive common names

- **Classification/status:** one validator-only label and two native-only
  labels, intentional.
- **Projects/versions:** SecuritySolutionsAPI / `2020-01-01`;
  ServiceFabricManagedClusters / `2026-05-01-preview`.
- **Source:** SecuritySolutionsAPI `back-compatible.tsp`, `models.tsp`,
  `routes.tsp`; ServiceFabric `back-compat.tsp`, `ManagedCluster.tsp`.

SecuritySolutionsAPI relocates methods into common group
`SecuritySolutionsReferenceData`, while its model is named
`securitySolutionsReferenceData` and the selected operation identifier is
`securitySolutionsReferenceData_List`. That produces one Swagger finding but
no native collision for this label.

ServiceFabric demonstrates the reverse direction:

```tsp
@@clientName(ManagedAzResiliencyStatusContent, "ManagedAzResiliencyStatus");
```

Its interface is `ManagedAzResiliencyStatus`, but the operation explicitly has
`@operationId("managedAzResiliencyStatus_Get")`. The retained Swagger has that
lowercase-initial identifier and a capitalized `ManagedAzResiliencyStatus`
definition.

| Engine  | Observed result                                                          |
| ------- | ------------------------------------------------------------------------ |
| Swagger | No ServiceFabric match: exact prefix case differs from definition        |
| Native  | One warning for this group, and one for `ManagedMaintenanceWindowStatus` |

**Disposition:** compare exact common names, without guessed capitalization.

### Referenced native types without local Swagger definitions

- **Classification/status:** native-only labels, intentional.
- **Projects/versions:** ApiManagement / `2025-09-01-preview`, AKS /
  `2026-05-02-preview`, Batch / `2025-06-01`.
- **Source:** ApiManagement `PrivateEndpointConnection.tsp` and
  `back-compatible.tsp`.

```tsp
model PrivateEndpointConnection is PrivateEndpointConnectionResource;
alias PrivateEndpointOperations = PrivateEndpoints<PrivateEndpointConnection>;
```

Common location metadata assigns the methods to `PrivateEndpointConnection`
(the supported fallback of `!javascript`). The selected Swagger instead uses:

```json
{
  "operationId": "PrivateEndpointConnection_GetByName",
  "responses": {
    "200": {
      "schema": {
        "$ref": "../../../../../../../../../common-types/resource-management/v5/privatelinks.json#/definitions/PrivateEndpointConnection"
      }
    }
  }
}
```

| Engine  | Observed result                                                      |
| ------- | -------------------------------------------------------------------- |
| Swagger | No matching local definition, hence no finding for this prefix       |
| Native  | One collision: the referenced named type belongs to the client's API |

AKS similarly returns `ArmResponse<Azure.ResourceManager.CommonTypes.OperationStatusResult>`
through a selected-version operation relocated to `OperationStatusResult`.
Batch's NSP configuration has `networkSecurityPerimeter?: NetworkSecurityPerimeter`,
and common metadata groups its operations under that name. Both selected Swagger
responses reference shared common-type files rather than local definitions.
**Disposition:** preserve native reference reachability; do not exempt common or
external-reference types, and do not parse references in production.

### Common metadata differs from AutoRest-scoped metadata

- **Classification/status:** native-only, intentional.
- **Project/version:** HybridContainerService / `2026-04-01-preview`.
- **Source:** `HybridContainerService/client.tsp`.

```tsp
@@Azure.ClientGenerator.Core.clientName(
  HybridIdentityMetadataOperationGroup,
  "HybridIdentityMetadata",
  "!autorest"
);
```

The common fallback names the real interface `HybridIdentityMetadata`, matching
its response model. The selected Swagger contains:

```json
{
  "operationId": "HybridIdentityMetadataOperationGroup_Get",
  "responses": {
    "200": { "schema": { "$ref": "#/definitions/HybridIdentityMetadata" } }
  }
}
```

| Engine  | Observed result                                     |
| ------- | --------------------------------------------------- |
| Swagger | No conflict with the longer serialized group prefix |
| Native  | One conflict under the common SDK group name        |

**Disposition:** honor supported common selection without impersonating an emitter.

### Historical declarations absent from the selected version

- **Classification/status:** native-only label, API-version population mismatch.
- **Project/version:** ContainerApps / selected `2026-01-01`.
- **Source:** `ContainerApps/AppResiliency.tsp`; the same removal annotation
  applies to its model and interface.

```tsp
@removed(Versions.v2026_01_01)
@armResourceOperations
@tag("AppResiliency")
interface AppResiliencies {
  // Operations omitted.
}
```

The native source program retains this historical group. The actual projected
HTTP graph for `2026-01-01` excludes its `get` operation, and selected Swagger has
neither its operations nor its model definition.

| Engine                   | Observed result                             |
| ------------------------ | ------------------------------------------- |
| Selected-version Swagger | No finding: the group is absent             |
| Unprojected native lint  | One valid source-level historical collision |

**Disposition:** account for this finding, Batch `Certificate`, and
ConfidentialLedger `ManagedCCF` in comparison evidence, not production suppressions.

### Named template types are not governed by schema inlining

- **Classification/status:** native-only fixture finding, intentional.
- **Fixture/version:** `inline-template-no-collision` / `2024-01-01`.
- **Source:** its `main.tsp`, with documentation annotations omitted.

```tsp
union Gizmo<T> {
  item: T,
  empty: "empty",
  other: string,
}
```

The real `Gizmo` interface returns `TestService.Gizmo<"one">`. The retained
`Gizmo_Get` response is an inline string schema with `enum: ["one", "empty"]`
and `x-ms-enum.name: "Gizmo"`; its definitions contain only `Item`.

| Engine  | Observed result                                             |
| ------- | ----------------------------------------------------------- |
| Swagger | No `Gizmo` definition, so zero findings                     |
| Native  | One group collision with the supported common template name |

**Disposition:** keep the SDK naming helper and remove inlining approximations.
The accompanying `Widget<Item>` has common name `WidgetItem`, so the group
`Widget` is compliant by native naming, not an inlining exemption.

### Native reachability defect: an unused sibling is not an API type

- **Classification:** native false positive.
- **Status:** fixed, with negative and positive native regressions.
- **Source:** the replaced unrestricted `visitDerivedTypes: true` traversal in
  `src/rules/no-operation-group-name-conflict.ts`.

This valid source should not warn:

```tsp
using TypeSpec.Http;
@service
namespace Example;
model Base {
  id: string;
}
model Used extends Base {}
model Unused extends Base {}
namespace Groups {
  interface Unused {
    @get read(): Example.Used;
  }
}
```

Before the fix, the diagnostic was
`Operation group 'Unused' conflicts with type 'Unused'. Rename the group, for example by using a plural name.`
Traversal ascends from `Used` to `Base`, then visits `Base`'s unrelated derived
model `Unused`. A per-client visited set prevents repeats but does not establish
API reachability. The corrected rule produces no warning for this source.

The pinned DevOpsInfrastructure source demonstrated the same problem. Native
compiler inspection reports zero compiler errors and this candidate path:

```text
Pools.get
  -> ArmResponse<Pool>
  -> Pool
  -> Azure.ResourceManager.CommonTypes.TrackedResource
  -> Azure.ResourceManager.CommonTypes.ResourceModelWithAllowedPropertySet
  -> Azure.ResourceManager.CommonTypes.Sku
```

The common library declares:

```tsp
model ResourceModelWithAllowedPropertySet extends TrackedResource {
  // Other permitted resource-envelope properties omitted.
  sku?: Sku;
}
```

`ResourceModelWithAllowedPropertySet` is a sibling of the actual resource, not
the resource returned by this API. This produced the spurious collision with
the real `Sku` interface. Excluding ARM common types by decorator or namespace
would hide the symptom rather than repair native reachability and is not an
acceptable fix.

DataFactory had the same defect, with a separately verified zero-error native
compile and path:

```text
Factories.get -> ArmResponse<Factory> -> Factory -> CommonTypes.ProxyResource
  -> CommonTypes.Resource -> CommonTypes.PrivateEndpointConnection
```

Its actual resource is `PrivateEndpointConnectionResource` with
`RemotePrivateEndpointConnection` properties; the unrelated common resource was
only reached as a sibling through `Resource`.

**Required changes, completed:** explicit base/member traversal, supported
discriminator alternatives, unused-shared-base negative/direct-reference positive
regressions, cross-root isolation, and recursive/intermediate polymorphic cases.
The final corpus removes exactly these two findings, adds none, and preserves all
other native findings. No emitter, validator, suppression, or normalization change
was made.

### Compile-failure population

All six failures are preserved in the corpus metadata and raw compiler logs:

| Project suffix                                   | Compiler error                     |
| ------------------------------------------------ | ---------------------------------- |
| `Microsoft.Devices/DeviceProvisioningServices`   | `@typespec/http/duplicate-body`    |
| `Microsoft.Insights/Insights/TenantActionGroups` | `@typespec/http/missing-uri-param` |
| `Microsoft.Network/Network/Network`              | `@typespec/http/missing-uri-param` |
| `Microsoft.Quota/Quota`                          | `@typespec/http/missing-uri-param` |
| `Microsoft.Resources/deployments`                | `@typespec/http/duplicate-body`    |
| `Microsoft.ServiceLinker/ServiceLinker`          | `@typespec/http/duplicate-body`    |

These projects contribute 162 raw Swagger findings and six raw native findings
outside the assessable population. They are not silently counted as compliant.
No unrelated compiler or specification fix was attempted.

### Historical reports are not current native evidence

`docs/coverage_old.md` describes 450 compiled projects and 210 validator rules,
with 53 validator projects and zero local or official credit for this rule.
The pre-run canonical `specs/coverage-breakdown.md` records 55 validator projects,
487 diagnostics and zero mapped native diagnostics. The new run above uses the
same pinned specs input as this task but a different local rule/mapping.
Historical aggregate-only report data cannot identify missing individual
projects or establish equivalence.

| Report / row kind                      | Validator projects | Local native projects | Official credit | Observed overlap | Diagnostics                   |
| -------------------------------------- | -----------------: | --------------------: | --------------: | ---------------: | ----------------------------- |
| `coverage_old.md`, `lint`              |                 53 |                     0 |               0 |     Not supplied | Not supplied                  |
| Pre-run canonical production row       |                 55 |                     0 |               0 |                0 | 487 Swagger / 0 mapped native |
| Final native production row, `partial` |                 55 |                    58 |               0 |               54 | 487 Swagger / 131 native      |

The external snapshot has no source revision, generation timestamp, or per-project
inputs: the precise identities of its two-project difference cannot be reconstructed.
Its credit definition also includes official/no-action mappings; the canonical
report instead measures observed same-project overlap. No such official credit
exists in this rule's row, so that definition difference does not explain its
53-versus-55 population change.
The preserved dataset was generated `2026-08-06T08:03:27.940Z`; the pre-run
comparison was generated `2026-08-10T09:38:18.108Z`, with 462 of 468 projects.
Both files were inspected at source HEAD `e16db1ab337fd7022789c7437d10ee722b70480d`;
their historical generator commit is not recorded. The new run uses the unchanged
`test/harness/typespec-results.ts` at that HEAD plus the unpublished rule draft.
Its source/runtime fingerprints, raw results and complete cleanup archives are
retained in the task evidence. Readme suppressions were not applied to the retained
Swagger dataset; existing TypeSpec source suppressions remain unchanged.

The previous source contract's 502 diagnostics in 56 assessable projects
(516 raw diagnostics) are superseded AutoRest-oriented results. They must not be
presented as measurements of the new guideline. The native contract and the
reachability, member-owner and scope defects are covered by passing regressions; Swagger functional
equivalence is deliberately not claimed.

The approved source redesign is cycle 2, not another attempt to recover Swagger
count parity. Prior source/promotion reviews do not review this replacement.
Publication requires a clean complete-diff follow-up, then a fresh development PR
review before promotion may consume the new source.
