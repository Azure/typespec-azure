# Reusable baseline and migration evidence

This is the native-first evidence role, not a second implementation/promotion
PR. Read [native-first.md](native-first.md) for the scheduling and acceptance
contract. Keep publication identities distinct from the native code owner.

## Shared Swagger publication and discovery

Native-first consumers discover the shared Swagger baseline before specs setup;
follow the [consumer/producer contract](../analyze-native-lint-coverage/shared-baseline.md).
The initial publication uses the verified `msyyc/azure-rest-api-specs` fork,
branch `evidence/shared-swagger-baseline`, with `.lintdiff-baselines\current.json`
and immutable `.lintdiff-baselines\swagger-arm-20261026-2cd3c5dd\baseline.json`.
Pin the fetched metadata commit and version descriptor before reading data.
The metadata branch is derived from frozen source, but its new metadata commit
is not the tested source commit. Runtimes use descriptor `source.commit`.

The large archive belongs to the same specs repository's release
`swagger-lint-baseline-20261026-2cd3c5dd`, asset
`swagger-arm-20261026-2cd3c5dd.tar.gz`. Record descriptor SHA-256, archive size/hash,
baseline identity, source preservation tuple and verified download receipt.
Archive root retains `manifest.json`, `baseline.json`, `dataset\**`; do not
commit the unpacked large dataset to Git. The unchanged source preservation ref
`evidence/long-running-operations-options-validator-20261022-source` remains
separate from metadata discovery and runtime injection.

Shared Swagger-only completion is not native completion. Native execution,
full population, controls, investigations, independent local reviews and A/B
checkpoints remain required. Changing a validator selector alone does not
require a refresh. Missing/incompatible publication blocks consumers with an
exact prerequisite; only an explicitly requested producer runs the Swagger
suite. Refresh appends new immutable assets and advances discovery only after
verification, retaining prior versions. Legacy flow stays unchanged.

## Publication binding and layout

Before setup, resolve the signed-in user's actual personal fork of
`Azure/typespec-azure` through GitHub identity, not a remote name or guessed
account. Verify write permission and the exact evidence branch/ref, existing
ownership and remote SHA. Permission for evidence does not authorize native
or skill PR heads in a fork. Do not create another fork automatically.

Use one dedicated in-folder worktree for coverage generation, local replay,
evidence publication and `migration.md`; do not put output inside clean
candidate/specs inputs. Prefer a verified existing evidence worktree under the
[reuse contract](preparation.md#native-first-worktree-reuse). Do not require a
fourth persistent replay worktree. Record any session-bound publication owner
and supported push controls. Never assume a directory change changes
publication identity.

```text
migration-evidence\
  baselines\<baseline-id>\
    manifest.json
    artifacts.json
  tasks\<task-id>\
    task.json
    migration.md
    evidence-details.md
    members\<validator-id>\
      migration.md
    runs\<run-id>\
      manifest.json
      coverage.json
      coverage.md
      native-results\
```

Use the tooling's actual dataset/receipt filenames below these directories,
not an invented cache schema. Singleton evidence may retain an existing per-rule
layout with explicit links. Baselines are shared by reference, not copied per
member. Store mutable local logs, unpacked Swagger, dependencies and archives in
an ignored local area. An ignored file is not backed up by pushing the branch.
Retain verified downloaded assets and unpacked baseline/replay inputs here for
later runs. Preserve each prior run and use a new empty directory for every
coverage invocation; local caches never replace integrity/compatibility checks,
fresh required native execution, or durable publication.

Commit compact sanitized manifests, project inventory/failed population, member
diagnostic shards, reports, fixture/claim mapping and `migration.md`. Remove
machine-specific absolute paths from published copies while preserving content
identity and portable project-relative source locations. Preserve the original
raw receipts locally; sanitization must not alter diagnostic counts or targets.
Never publish credentials, environment dumps, user mail, `node_modules`, raw
`log.txt` or unrelated/private inputs.

Distinguish actual machine paths from documented virtual compiler-test paths.
A verified harness-owned prefix such as `Z:/test/` is diagnostic evidence, not
a machine-local checkout to rewrite or reject. Verify that provenance before
preserving it; this is not permission to allow arbitrary drive paths or skip
the remaining sanitization checks.

When validating evidence with tools installed in a prepared native/tooling
checkout, explicitly select that checkout's configuration. The command's cwd
alone does not prevent configuration discovery beside the target files.
Verify configuration equivalence and retain applicable rules and overrides.
Disable nested discovery only when no distinct required configuration is
omitted. Do not install or build the evidence checkout merely to load an
identical configuration from the prepared checkout.

Write generated publication text, including JSON and task-scoped
`.gitattributes`, as UTF-8 with LF endings before freezing published hashes.
Preserve original raw receipts separately. A `-text` attribute preserves CRLF
too; it does not normalize generated files or make them pass Git's whitespace
check. Validate the actual staged text with `git diff --cached --check` before
commit/publication, and verify staged blob hashes after any intentional
normalization. Do not disable whitespace checks or rewrite immutable raw
receipts to fix publication formatting. A failed check still follows the
existing bounded correction policy.

Before committing, compare the complete publication inventory with Git's staged
paths. Directory staging can omit ignored manifests and `.log` receipts. When
necessary, force-add only explicitly inventoried sanitized receipts; never
force-add raw execution logs, dependencies or unrelated output.

After committing and before pushing, verify each recorded published SHA-256
against the actual Git blob bytes, not just working files. Git text filters can
change line endings. Preserve exact evidence bytes with task-scoped
`.gitattributes`, or explicitly record intentional normalization, retain original
hashes and recompute published hashes. Verify the declared hashes again from a
fresh checkout. Do not waive mismatches as harmless formatting differences.

When appending review/status metadata, read existing text explicitly as UTF-8
and serialize new text with explicit UTF-8/LF, including on Windows. Byte-preserving
`-text` attributes do not repair encoding or newline changes introduced by a
writer. Preserve unchanged report/receipt bytes, verify their hashes before
publication, and keep `git diff --check` enabled. Normalize only the explicitly
changed metadata, never the sealed baseline or historical raw receipts.

Read Git blobs as bytes. For subprocess capture, use an explicit bounded buffer
that covers the measured largest blob, or stream the bytes. Node's default
stdout limit can be smaller than full-population JSON. A capture overflow is
not a blob mismatch: preserve the failed attempt and correct the reader under
the existing recovery limits. Never truncate or decode/re-encode blob bytes
before hashing.

Measure dataset size before choosing Git versus artifact storage. Retain large
Swagger/packages/build logs as durable downloadable fork release assets or
another explicitly approved backend, recording stable references, byte hashes
and source/build provenance. CI expiry alone is not durable storage. Verify
upload completion and a download/hash round trip before marking evidence
published; checksum mismatches or unavailable required assets block replay.
Never overwrite an immutable baseline/asset or retry an uncertain upload blindly.

Use a single writer/lock for a shared evidence checkout and branch. Fetch and
reconcile the recorded exact remote head before appending; unexpected changes
block publication rather than authorizing a force-push. Writable specs execution
also needs exclusive ownership or a separate runtime. Preserve staging and
failure receipts; publish a complete manifest only after integrity verification.

## Specs source retention

Generated coverage data does not replace the TypeSpec source needed to regenerate
it. Preserve the selected specs commit, including its examples, external Swagger,
common types, configuration and dependency manifests/locks. Keep those source
inputs separate from generated reports and candidate package assets.

For durable regeneration, prefer a run-specific preservation branch in the
signed-in user's existing personal fork of `Azure/azure-rest-api-specs`.
Discover the actual fork and verify its canonical parent, write permission,
publication owner and exact destination ref independently of the TypeSpec Azure
evidence fork. Never guess the owner from a remote name, reuse an unrelated
branch, create a fork automatically or publish a specs PR for this purpose.
The evidence publisher may manage this auxiliary ref only when its backend can
explicitly address that repository.

For unchanged source, create the preservation branch at the **exact frozen
specs commit**, not today's upstream tip. No extra commit or source copy is
needed. For reuse, verify the recorded branch still points to that SHA; do not
move it. A new source snapshot needs a new preservation ref. Verify remote
readback/fetch and record the canonical repository/selected SHA plus personal
repository/ref/SHA in the publication receipt and `migration.md`.

If authored specs changes are required, commit only the reviewed source changes
on a dedicated personal specs branch **before** selecting the clean validation
snapshot. Record both the upstream base and tested commit. That changed commit
requires a new baseline; never append changes to a branch backing sealed
evidence. Keep runtime injection overlays, temporary configs, `node_modules`,
caches and generated corpora out of the source branch. Retain their necessary
commands, inputs and package hashes in the evidence instead.

A personal specs branch is not technically necessary when the unchanged
canonical commit can be fetched independently. If no suitable existing fork or
publication capability is available, record that verified canonical source or
a checksummed source bundle as the retention method and state its limits.
If required source cannot be recovered, ask for the missing fork/access or an
approved archival destination; do not claim reproducible regeneration.
Preserving a source ref alone does not establish baseline compatibility, lock
all runtime dependencies or prove a full rerun.

## Provenance without circular commits

Validate immutable candidate snapshot `S` and packages `P`. After required
checks/local review, commit native task content `C` and verify its source equals
the tested snapshot; retain both identities where different. Evidence commit
`E` references `C`, `S`, `P` and baseline `B`; the native PR's migration-report
section links directly to `migration.md` on the actual evidence branch whose
verified pushed head is `E`, under the shared
[two-section PR body](../shared/migration-pr-description.md). Keep provenance in
that report or its appendix, not extra PR content.
Do not amend `C` merely to insert its own evidence hash.
The evidence publisher returns `E` after pushing; `migration.md` need not
contain its own commit ID. Subsequent evidence commits can append review and
publication receipts for `C`, not fictional reviews of themselves.
Keep the evidence branch and report path stable, including after the native PR
merges; do not delete or rename them as routine PR cleanup. Later report commits
use the same branch-based PR URL. Record each new pushed SHA and its immutable
report/receipt links in append-only audit records instead of rewriting that URL.

Baseline identity includes schemas, specs/core/compiler/library/emitter closure,
lock/integrity data, actual AutoRest/validator/rulesets, generator/worker identity,
settings, API version/reference/suppression/selection policies, time, project
success/failure inventory and artifact hashes. Record which identities the
installed tool verifies automatically and which need explicit receipts. Do not
claim full transitive locking or automatic source attestation from version
strings or hashes alone. Time-sensitive results describe the recorded historical
evaluation; current-time reassessment needs a fresh validator run.

## Migration note and replay

Write singleton, group and member `migration.md` using the shared
[four-section report plus NOTES contract](../analyze-swagger-typespec-lint-gap/SKILL.md#migration-note).
Keep the linked original Swagger linter and supported conclusion short, and
diagnostic totals distinct from project counts. Section 4 covers only differing
projects/diagnostic groups; the appendix groups their exact targets and both
linters' counts, causes and dispositions. Retain matching controls separately.
Put technical context in NOTES and source/schema examples, full investigations
and replay instructions in `evidence-details.md` or an existing linked appendix.
Do not add a standalone fifth examples/actions section. Supporting evidence
remains required; moving it does not waive validation or hide material limits.

The group note retains the member status matrix, combined raw/comparable counts,
directional gaps and explanations in the corresponding sections. Link every
member to its own semantic/fixture evidence and original validator source.
Describe intentional native differences separately from functional equivalence.
Do not invent per-member native coverage when attribution is unavailable.
Keep public native docs native-first, with all original mappings in their
dedicated provenance section.

From a fresh evidence checkout, retrieve the selected immutable baseline and
assets, verify hashes and compatibility, and reconstruct inputs without the
original development worktree or Copilot session directory. A replay must use
the recorded specs commit and closure, not resolve latest again. Test this
round trip before claiming portable reuse.

Use a temporary clean checkout of the published evidence commit for this
independent recovery check, not a fourth persistent role. Do not seed it from
unpublished local evidence or treat replay in the populated evidence worktree
as fresh-checkout proof. After verification, retain the receipt and verified
downloaded inputs in the persistent evidence role; remove only the task-owned
temporary checkout after preserving any unique files and stopping its activity.
This keeps the recovery gate intact while allowing later runs to reuse inputs.

Push the evidence branch and return its repository/ref, actual pushed commit,
branch-based `migration.md` URL for the PR, separate immutable report/receipt
links for audit and replay, specs retention tuple and asset/verification receipts.
Verify both URL forms against the actual pushed branch head. Local commits or
ignored output alone do not satisfy publication.
Preserve the following distinct recovery paths:

- **Read saved evidence:** retrieve the committed note, manifests and linked
  assets without rerunning either linter.
- **Reanalyze saved observations:** retain a dependency-free helper or exact
  commands to regenerate numerical reports from downloaded observations. Verify
  the claimed outputs independently; this does not rerun native diagnostics or
  restore a sealed CLI baseline.
- **Regenerate coverage and the migration note:** retain the exact tooling,
  candidate/core and specs source identities; artifacts, dependency/runtime
  identities and available locks; mapping/options and population policies; and
  build, injection, validation and analysis commands. Recover source from the
  preserved specs ref and verify its SHA before execution. Rerun required
  semantic controls and gap investigations before writing a new `migration.md`;
  counts alone cannot regenerate its equivalence conclusion. Record unavailable
  runtime locks and untested reruns explicitly. Do not promise identical counts
  or prose without evidence.

Required failures/unfinished investigations remain visible and block their
corresponding success claim. Final success requires the verified native head,
both review checkpoints, complete required checks and published evidence.
Reusing data never waives native execution after a relevant rule change.
