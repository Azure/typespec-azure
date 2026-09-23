# Manifest-based corpus cleanup

Use `corpus_cleanup.py` for `specs:typespec` output cleanup. It needs Python 3.12+
and Git, not the monorepo dependencies. It never runs the corpus, stages files,
changes the index, resets branches or deletes directories.

Run from the verified task worktree with `mise exec -- python -X utf8 -B` and
the absolute authoritative helper path. Use distinct evidence directories
outside the repository. Example PowerShell variables:

```powershell
$Repo = "C:\dev\worktrees\lintdiff-example"
$Helper = "C:\dev\worktrees\lintdiff-migration-new\.github\skills\develop-lintdiff-rule\corpus_cleanup.py"
$Evidence = "C:\path\to\session\files\corpus-run"
mise exec -- python -X utf8 -B $Helper --repo $Repo capture --output "$Evidence\before"
# Run the representative and full corpus, preserve logs and migration evidence.
# Confirm every writer has completed and the required validation passed.
mise exec -- python -X utf8 -B $Helper --repo $Repo plan --snapshot "$Evidence\before" --output "$Evidence\plan" --quiescent
# Inspect plan.json, archive identities, and every planned change.
# Substitute the exact SHA256 returned by plan, not a newly recomputed approval.
mise exec -- python -X utf8 -B $Helper --repo $Repo apply --plan "$Evidence\plan" --approve "<approved-plan-sha256>" --quiescent
```

`--quiescent` is the caller's attestation after verifying stopped writers, not a
process detector. No other actor may modify the corpus between capture and
cleanup. Before apply, the parent/owner verifies the run's identity, complete
output ownership and plan. Unexpected concurrent activity stops cleanup.

## Safety and evidence

- Capture refuses preexisting tracked corpus changes. It inventories files
  (including untracked/ignored files), binds repository/HEAD/corpus index, and
  archives the exact bytes of existing generated outputs. Source edits outside
  `packages\typespec-lintdiff\specs` are untouched.
- The output policy is derived from `test\harness\typespec-results.ts`: top-level
  TypeSpec/comparison/coverage reports and `_meta.json`, **all** JSON rule shards
  under `results\by-typespec-rule`, and known TypeSpec stdout/stderr/projected
  HTTP graph files plus the legacy `typespec.projected-enum.json` output under
  project `raw` directories. It is not restricted to the rule currently being
  developed. Swagger inputs, source copies and other paths are not eligible
  cleanup targets.
- Plan archives generated run output before any restoration, records additions,
  modifications and deletions, and refuses changes to non-output paths.
  Preexisting untracked files are retained; regenerated preexisting outputs are
  restored to their captured bytes, not deleted.
- Apply requires the approved plan digest, unchanged baseline/archive hashes,
  HEAD/index and the exact post-run inventory. It verifies all changes before
  mutation, restores original bytes/modes and deletes only individually named
  new output files. It rejects links, Windows reparse points and hard links.
- The exclusive `apply.jsonl` journal preserves completed operations on partial
  I/O failure. Do not replay a partially applied plan, automatically roll back,
  or report success: preserve the journal and stop for bounded, evidence-backed
  recovery. A successful apply verifies the complete baseline inventory.
- No helper call automatically retries. A missing baseline on a resumed old run
  cannot be reconstructed by capturing the already-modified corpus. Preserve
  its old evidence and follow the explicit bounded-resumption policy.

Retain evidence outside the checkout through publication. If the harness gains
another output kind, do not broaden a wildcard or bypass the refusal mid-run:
establish ownership and update the helper and its offline regressions through
the normal authorized skill-change workflow.

```powershell
mise exec -- python -X utf8 -B -m unittest discover -s .github\skills\develop-lintdiff-rule -p test_corpus_cleanup.py
```
