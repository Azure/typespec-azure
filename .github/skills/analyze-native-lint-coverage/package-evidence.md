# Native-package evidence without a selected lint

Use this lane only after intake establishes a template-generated,
library-diagnostic or documentation/provenance outcome. It does not authorize
new native policy, retire a legacy requirement, or establish functional
equivalence. A real native lint gap still uses `--tsp-rule`.

Use `--native-package <official-destination-package>` instead of `--tsp-rule`.
Supported destinations are Azure Core, Resource Manager and TCGC. Keep
`--scope source`; diagnostic-location alignment has no meaning without a
selected lint. Mixing this flag with lint targets is an error.

For example, substitute the task's frozen absolute paths. Run from the tooling
harness package so Node resolves its declared `tsx` dependency:

```powershell
$specsRepo = "C:\dev\worktrees\frozen-specs"
$specsManager = (Get-Content "$specsRepo\package.json" -Raw | ConvertFrom-Json).packageManager
Set-Location C:\dev\worktrees\coverage-tooling\packages\typespec-lintdiff
mise exec $specsManager -- node --import tsx/esm test\harness\native-coverage.ts `
  --candidate-repo C:\dev\worktrees\native-candidate `
  --specs-repo $specsRepo `
  --tgz-dir C:\dev\artifacts\candidate `
  --baseline-run C:\dev\baseline-inputs\verified-shared-baseline `
  --output C:\dev\evidence\fresh-run `
  --validator-rule LongRunningOperationsOptionsValidator `
  --native-package @azure-tools/typespec-azure-core
```

The invocation still needs the specs checkout's declared package-manager version
and approved registry on PATH, as required by the parent coverage skill. The
paths above illustrate arguments, not permission to create execution checkouts
outside the queue's selected folder. Use the selected folder and actual paths.

The analyzer injects the clean candidate closure, verifies the selected native
package and shared compiler identity, consumes the pinned
[shared Swagger baseline](shared-baseline.md) without Swagger regeneration, and
compiles the same full source population using its existing configuration.
It preserves package hashes, raw member observations, native ambient diagnostics
and failed projects. Existing configured lints are not silently disabled.
Artifact/runtime compatibility checks and any required
`--baseline-compatibility-receipt` still apply; same specs SHA alone is not proof.

`coverage.json` uses `assessmentMode: package-evidence` and schema version 3.
Native diagnostic counts, comparison metrics and coverage percentages are
explicitly not applicable. Successful source compilation is not proof of
template enforcement, native equivalence or absence of a functional gap.
Library warnings remain ambient evidence; they are not relabeled as lint results.

Keep all normal acceptance gates: clean source-to-artifact identity,
packed/injected violating and compliant controls for the actual native
mechanism, representative preflight, the declared full required population,
target-specific investigation of every legacy observation, reproducible fork
evidence and both independent local/GitHub checkpoints. Controls must assert
the existing mechanism's observed behavior, not the absence of a made-up lint.
Do not claim a newly implemented lint or strict parity for a scoped guidance
outcome. Unassessed projects and unapproved policy differences still block
claims that require them.
