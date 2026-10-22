# ImplementPrivateEndpointAPIs migration evidence

## Classification and audience

This is a native coverage gap, not a duplicate of an enabled official rule.
The official ARM rules and independently selectable `PrivateEndpoints` and
`PrivateLinks` templates do not require the complete three-path set. For example,
the standard connection templates can compile without a private link collection.
The official `nested-resources-must-have-list-operation` rule covers a separate
requirement and does not replace this check.

The upstream rule belongs to ordinary ARM: `azArm`, `OpenApiTypes.arm`,
`SDKViolation`, `Global`, and `given: "$.paths"`. It is not an RPaaS-only rule.
The existing local `tsp-lintdiff-local-linter/all` ruleset enables the native rule.
No activation setting changes in this migration. The recommended official owner
is `@azure-tools/typespec-azure-resource-manager`, with a new official rule
disabled by default.

## Native contract

For each exact parent path, the presence of any of these case-insensitive
suffixes requires all three:

- `/privateEndpointConnections/{privateEndpointConnectionName}`
- `/privateEndpointConnections`
- `/privateLinkResources`

The point path accepts any nonempty single-segment parameter name. Parent
prefixes remain exact strings; the rule does not normalize their case or
parameter names. No matching paths means no warning. HTTP verbs and CRUD
completeness are not part of this rule.

The rule visits concrete operations and checks public
`getArmResourceOperationData` metadata before resolving their paths with
`getResourceOperation`. This includes lifecycle, list, action, and legacy
registrations, including registrations against custom, structurally compatible,
and explicit library resource models. It does not require those models to be
returned by `getArmResources`. Arbitrary unregistered HTTP routes remain outside
the native contract, even inside an `@armResourceOperations` interface.

The rule reports one warning per missing suffix and parent. It chooses an
existing connection point, then a connection collection, then a private link
collection as the diagnostic anchor. The authored interface is preferred to its
operation. Counts, missing-path messages, exact grouping, and target preference
are unchanged.

There is no emitter execution, OpenAPI-reference inference, client-generator
dependency, or production version mutation. The rule uses the compiled program;
it does not recreate historical service-version projections.

### Why complete operation identities matter

Resource operation summaries can overwrite same-name operations from different
interfaces or route contexts. The legacy registration path stores all operation
kinds in a name-keyed list summary. Some models also have valid ARM operation
registrations without full ARM resource registration.

The native rule therefore uses the public per-operation registration rather
than resource-model enumeration or name-keyed summaries. The shared ARM
registration library is not changed.

## Supported-shape and emission evidence

The native predicate concerns registered HTTP paths, not emitted schema shapes.
For comparison, the upstream predicate inspects the emitted document's `paths`
keys. The emission boundary is the HTTP route exposed as an OpenAPI path; no
schema-reference branch determines this rule.

| Authored shape                                                | Support and relevant output                                                                   | Expected validator / native result                                                      | Evidence                                                                                                                   |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| No private APIs                                               | Standard ARM authoring; no matching path keys                                                 | No warning / no warning                                                                 | Presence mask `0`, `no-private-endpoints`                                                                                  |
| Any incomplete subset of the three paths                      | Standard `PrivateEndpoints` and `PrivateLinks` operations expose the represented path keys    | One warning per missing path / same native unit                                         | Presence masks `1`–`6`, six violating comparison fixtures                                                                  |
| Complete standard template set                                | All three path keys present                                                                   | Clean / clean                                                                           | Presence mask `7`, `compliant`, actual Correct snippet                                                                     |
| GET action supplies the link collection                       | Supported `ArmResourceActionSync` with explicit request/response arguments and action name    | Complete set clean; link-only set misses two connections / same                         | `action-compliant`, `action-link-only`, native action controls                                                             |
| Same-name operations across interfaces and parents            | Supported standard or legacy registrations retain distinct HTTP routes                        | Complete sets clean; incomplete parents checked independently / same native requirement | Both declaration orders, compliant and violating read/list and action regressions                                          |
| Legacy operations on custom or structurally compatible models | Supported `LegacyOperations`; registered paths exist without full resource registration       | Complete set clean; link-only set misses two connections / same native requirement      | Custom and plain-model native controls; selected EventGrid and IoTHub source and matching-version Swagger                  |
| Explicit library resource override                            | Accepted standard private endpoint template customization; registered connection routes exist | Complete set clean; connection-only set misses links / same native requirement          | Native compliant/violating controls; selected HorizonDb source and matching-version Swagger                                |
| Concrete inherited template operations                        | Supported concrete operations carry ARM registration; generic companions are not endpoints    | Same path requirement without duplicate findings / same native requirement              | Exact-count concrete inherited-operation controls                                                                          |
| Unregistered custom HTTP route                                | Valid HTTP can expose a matching Swagger path without ARM operation registration              | Swagger path check can warn or complete a set / excluded from native population         | Native unregistered-route controls, including an otherwise-offending registered connection set; upstream `paths` predicate |
| Private APIs split across Swagger documents                   | Each document can omit paths that exist elsewhere in the service                              | Document-local warnings / compiled service can be clean                                 | SQL selected-version source and four retained Swagger documents                                                            |

The comparison fixtures prove emitted outcomes for their represented shapes.
The native regressions prove the rule's diagnostic contract without importing
an emitter. Corpus source and Swagger evidence support the additional shapes
listed above; the table does not claim that every native regression is also an
emitted-output fixture.

## Focused validation and claim mapping

The final native suite has **35 passing tests** in
[`implement-private-endpoint-apis.test.ts`](../../rules/implement-private-endpoint-apis.test.ts):

- Eight presence masks assert the exact missing-path messages and targets.
- Action controls and both-order collisions preserve complete action identities.
- Standard and legacy read/list collisions cover both declaration orders,
  complete matrices, and independently violating parents.
- Plain/custom registered models and explicit library resource registrations
  have compliant and violating controls.
- Unregistered routes cannot trigger the rule or complete an otherwise
  incomplete registered set.
- Concrete inherited operations exercise the rule's program traversal without
  counting template companions.
- Cross-interface target controls preserve point-before-collection-before-link
  preference, regardless of declaration order.
- Independent parents cannot supply each other's missing paths.

Before the population fix, the expanded 31-test selection produced **14
semantic failures and 17 passes**, without template-binding errors. Complete
registered-operation traversal made those cases pass. The final 35-test
selection also includes the inherited-operation and diagnostic-target controls.

Strict fixture validation passes all **10 fixtures**, with no unresolved gaps.
The three validator-clean cases retain reviewed ambient warnings from other
rules. These warnings are recorded explicitly, not suppressed or treated as
target-rule findings.

The actual published Incorrect and Correct snippets in `rule.md` were compiled
with the target rule explicitly enabled. Incorrect produces exactly one
missing-`privateLinkResources` warning on the interface; Correct produces none.
Both use standard ARM templates and the actual `common.tsp` setup, without an
emitter import. The validated document SHA256 is
`ac340ca6354f1a47652976a39c8b5544aa47168d05322631560237d2c4ac3737`.
This is one-time snippet evidence, not a continuous Markdown-parser test.

Required checks included package build, the native selection, strict focused
fixtures, actual final snippets, changed-file formatting, configured TypeScript
linting, and diff hygiene. The Chronus entry was formatted explicitly because
the repository's normal Prettier ignore file excludes `.chronus/changes`.

## Corpus provenance and final populations

The required representative and full runs use the existing `specs:typespec`
runner, not a new per-rule runner:

```text
pnpm --dir packages/typespec-lintdiff specs:typespec --specs-repo <pinned-specs-worktree> --filter attestation --concurrency 6
pnpm --dir packages/typespec-lintdiff specs:typespec --specs-repo <pinned-specs-worktree> --concurrency 6
```

Both commands completed successfully. Attestation selected one project and
compiled successfully. The full run attempted **468 projects**: **462 compiled**
and **six failed compilation**.

The specs pin is `f6b53f105b95da05276530a0754a1c71b4f16397`. The retained
validator results were generated on 2026-08-06; the final TypeSpec run was
performed on 2026-10-19 against that same specs pin. This is not a claim that the
upstream validator corpus was rerun.

| Population                                                   | Validator diagnostics / projects | Native diagnostics / projects |
| ------------------------------------------------------------ | -------------------------------- | ----------------------------- |
| Raw retained/final shards, including failed programs         | 19 / 4                           | 5 / 3                         |
| Exact project + missing-path deduplication                   | 11 / 4                           | 5 / 3                         |
| Aligned 462 compiled programs, raw                           | 10 / 3                           | 4 / 2                         |
| Aligned 462 compiled programs, exact path-unit deduplication | 10 / 3                           | 4 / 2                         |

The raw native shard includes one Network finding on a failed program. The
validator shard has nine repeated findings for that project. Both sides exclude
Network for the aligned comparison; no finding is silently dropped from the
reported raw totals.

The aligned project overlap is two: RecoveryServices and RecoveryServicesBackup.
SQL is the only validator-only project. There are **no native-only compiled
projects**. Exact project + missing-path comparison has four shared units, six
validator-only SQL units, and no native-only units. There is no case,
parameter-name, or version normalization. The harness's generic normalized
counts and diagnostic consistency percentage remain `null`.

### Selected-version attribution

- **RecoveryServices, 2026-05-31-preview:** the selected graph reaches the
  standard private link read/list declarations. Both connection paths are
  absent. The two native missing-path findings match the validator.
- **RecoveryServicesBackup, 2026-05-31-preview:** the selected graph reaches the
  private endpoint point operations. The collection and link collection are
  absent. The two native findings match the validator.
- **SQL, 2025-02-01-preview:** four feature-split Swagger documents produce six
  document-local missing-path warnings. The service-wide path unions for
  servers and managed instances are complete. The selected graph reaches the
  standard ARM private-operation declarations, so native zero is not inferred
  from missing registration.
- **DesktopVirtualization, 2026-04-01-preview:** complete private APIs were
  previously obscured by same-name actions. The complete action identity
  regressions and final source/graph evidence explain the corrected result.
- **EventGrid, 2025-11-15-preview; HealthcareApis, 2025-04-01-preview;
  HorizonDb, 2026-01-20-preview; IoTHub, 2026-05-01-preview; AppService,
  2026-07-15:** selected source declarations and matching-version Swagger show
  complete sets. Earlier nine false missing-path findings came from
  name-keyed non-action summaries or omitted registered models. The complete
  registration traversal removes those findings. These are supported
  registrations, not blanket intentional exclusions.

Selected projected graphs contain source coordinates, not operation IDs or HTTP
paths. Attribution maps those coordinates to the pinned source and inspects the
retained matching-version Swagger separately. Declaration counts are not
interpreted as HTTP operation counts, and matching totals do not prove version
equivalence.

### Compilation failures

The same six projects fail compilation before and after the final change:

| Project                    | Baseline errors | Final errors | Actual signature comparison                         |
| -------------------------- | --------------- | ------------ | --------------------------------------------------- |
| DeviceProvisioningServices | 12              | 4            | Same duplicate-body signature; multiplicity differs |
| TenantActionGroups         | 8               | 8            | Same code/message multiset: missing URI parameters  |
| Network                    | 2               | 2            | Same code/message multiset: missing URI parameter   |
| Quota                      | 4               | 4            | Same code/message multiset: missing URI parameters  |
| deployments                | 2               | 2            | Same code/message multiset: duplicate body          |
| ServiceLinker              | 12              | 4            | Same duplicate-body signature; multiplicity differs |

Actual raw stdout/stderr, locations, hashes, and code/message signatures were
compared. No new target-rule exception or compiler-error signature was found.
This is not a claim that all baseline and final error multiplicities match.
Failed programs are outside the assessable native equivalence population.

## Source/runtime distinction and retained evidence

Fixture metadata comes from read-only `Azure/azure-openapi-validator` commit
`1198225afecbb818c3050d4d2a91da92e14e56ce`, whose rulesets package is 2.2.7.
The installed validator package is 2.2.4 and its rulesets runtime is 2.2.6.
The target registration and predicate were checked for compatibility, and the
target metadata audit has zero issues. These are distinct pinned identities;
they are not represented as one commit or version. A broader supplemental
catalog audit had ten unrelated issues; those were retained and not repaired.

Durable cycle evidence includes command receipts and raw output for build/native,
focused fixtures, snippet proof, representative/full corpus, compilation
triage, and exact path-unit comparison. It also retains selected graph/source
and Swagger attribution, complete before/after inventories, archived generated
outputs, the reviewed cleanup plan, its exact approved digest, and the apply
journal. No generated corpus result is included in the rule change.

An earlier optional research payload was overwritten by its command receipt.
Its detailed records remain unavailable; they were not recovered or rerun.
Required final-run graph/source analysis supplies the reported attribution
independently. Earlier command failures and corrective attempts remain in the
execution record; they are not passing validation evidence.

## Equivalence conclusion

The native rule enforces the three-path requirement for supported registered ARM
operations. Unregistered custom HTTP and document-local versus compiled-service
aggregation are explicit comparison boundaries. Historical version projection
and the six failed programs limit the corpus comparison.

Coverage is therefore **native semantic coverage with documented Swagger
differences**, not universal Swagger equivalence. Full corpus overlap cannot
replace the supported-shape regressions or justify extending the rule to
unregistered HTTP.
