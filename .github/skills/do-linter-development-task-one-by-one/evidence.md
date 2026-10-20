# Reusable baseline and migration evidence

This is the native-first evidence role, not a second implementation/promotion
PR. Read [native-first.md](native-first.md) for the scheduling and acceptance
contract. Keep publication identities distinct from the native code owner.

## Publication binding and layout

Before setup, resolve the signed-in user's actual personal fork of
`Azure/typespec-azure` through GitHub identity, not a remote name or guessed
account. Verify write permission and the exact evidence branch/ref, existing
ownership and remote SHA. Permission for evidence does not authorize native
or skill PR heads in a fork. Do not create another fork automatically.

Use a dedicated in-folder evidence worktree; do not put output inside clean
candidate/specs inputs. Record any session-bound publication owner and supported
push controls. Never assume a directory change changes publication identity.

```text
migration-evidence\
  baselines\<baseline-id>\
    manifest.json
    artifacts.json
  tasks\<task-id>\
    task.json
    migration.md
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

Commit compact sanitized manifests, project inventory/failed population, member
diagnostic shards, reports, fixture/claim mapping and `migration.md`. Remove
machine-specific absolute paths from published copies while preserving content
identity and portable project-relative source locations. Preserve the original
raw receipts locally; sanitization must not alter diagnostic counts or targets.
Never publish credentials, environment dumps, user mail, `node_modules`, raw
`log.txt` or unrelated/private inputs.

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

## Provenance without circular commits

Validate immutable candidate snapshot `S` and packages `P`. After required
checks/local review, commit native task content `C` and verify its source equals
the tested snapshot; retain both identities where different. Evidence commit
`E` references `C`, `S`, `P` and baseline `B`; the native PR description links
to pushed `E`. Do not amend `C` merely to insert its own evidence hash.
The evidence publisher returns `E` after pushing; `migration.md` need not
contain its own commit ID. Subsequent evidence commits can append review and
publication receipts for `C`, not fictional reviews of themselves.

Baseline identity includes schemas, specs/core/compiler/library/emitter closure,
lock/integrity data, actual AutoRest/validator/rulesets, generator/worker identity,
settings, API version/reference/suppression/selection policies, time, project
success/failure inventory and artifact hashes. Record which identities the
installed tool verifies automatically and which need explicit receipts. Do not
claim full transitive locking or automatic source attestation from version
strings or hashes alone. Time-sensitive results describe the recorded historical
evaluation; current-time reassessment needs a fresh validator run.

## Migration note and replay

The group `migration.md` leads with the native conclusion, member status matrix,
combined raw/comparable counts, directional gaps and explanations. Link every
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

Required failures/unfinished investigations remain visible and block their
corresponding success claim. Final success requires the verified native head,
both review checkpoints, complete required checks and published evidence.
Reusing data never waives native execution after a relevant rule change.
