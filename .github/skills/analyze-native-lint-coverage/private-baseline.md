# Private baseline discovery, publication and reuse

This supplements the [private corpus contract](private-corpus.md). These are
publication defaults, not a claim that the branch, release or dataset exists.
A skill update creates none of them and does not authorize corpus execution.
Public descriptor schema 1 and public discovery remain unchanged.

## Explicit discovery binding

| Role                 | Default                                                  |
| -------------------- | -------------------------------------------------------- |
| Metadata repository  | `Azure/azure-rest-api-specs-pr`                          |
| Metadata branch      | `evidence/shared-swagger-baseline-rpsaas`                |
| Discovery path       | `.lintdiff-baselines\rpsaas\current.json`                |
| Specs source branch  | `Azure/azure-rest-api-specs-pr:RPSaaSMaster`             |
| Immutable descriptor | `.lintdiff-baselines\rpsaas\<baseline-id>\baseline.json` |

Verify actual private visibility and reader/writer permissions before use.
An explicitly authorized alternate **private** metadata repository/ref/path is
allowed; record the exact override. Do not guess a personal fork or create one.
The metadata branch is not the specs runtime or native implementation branch.
Its commit identifies metadata; descriptor `source.commit` identifies tested
specs. Native candidates still use their separately recorded canonical source.

Keep the discovery binding in the readiness manifest, ledger and every review
handoff: repository/ref/commit, discovery path/hash, descriptor path/hash,
baseline ID/identity and corpus identity. Store the selected descriptor and
binding privately. Consumers compare that selection with the task's requested
corpus, service-list identity, full project/version inventory and validation
profile before setup. A mismatch blocks, even when the archive is valid.

## Versioned private metadata and dataset

Private discovery JSON has exactly these fields:
`schemaVersion: 2`, `corpusProfile: rpsaas-private`, `baselineId`,
`descriptorPath` and `descriptorSha256`. Use a safe repository-relative descriptor
path and the SHA-256 of its exact Git blob bytes, including line endings.
`current.json` selects one immutable version; it is not the baseline itself.

Private descriptor schema 2 retains the public descriptor's fields and adds
`corpus`. It requires `source.repository: Azure/azure-rest-api-specs-pr`.
`archive.repository` must equal `source.preservationRepository`; both source
preservation and asset publication must use authorized private storage.
`producer.selection` remains `serviceType: resource-manager`, `filter: null`,
`limit: null`: the complete selected corpus is defined by `corpus`, not a
substring filter. `dataset.projects` counts distinct project paths and the
additional `dataset.projectVersions` counts assessed project/version pairs.
Other counts and zero-failure requirements retain their existing meanings.

The `corpus` object contains exactly:

- `profile: rpsaas-private`, `sourceBranch: RPSaaSMaster`,
  `versionPolicy: all-supported`.
- `serviceList`: private issue-comment `url`, UTC `updatedAt`, and body `sha256`.
- `services`: unique canonical `specification/<service>` paths.
- `projectVersions`: unique objects with `project` and `apiVersion`, covering
  every required project/version and every allowlisted service.
- `validationProfile`: `id: production-arm` and `sha256` of the retained
  registration/options/profile evidence. This helper does not support RPaaS
  execution profiles; a private branch does not imply RPaaS validation.

Use the helper's Node-compatible `identity(corpus)` for corpus identity.
Preserve the private service-list snapshot, inventory/discovery method and
validator-profile evidence with the producer receipts. Hash agreement binds
these assertions; it does not independently prove source discovery or execution.

The private archive retains the existing roots: `manifest.json`, `baseline.json`
and `dataset\**`. Its private formats are:

- Sealed manifest schema 2, complete Swagger-only status, native assessment
  `not-run`, completion timestamp and baseline identity.
- Baseline schema 2, with `context.corpus` equal to descriptor `corpus`, the
  exact private specs repository/SHA, runtime context and full hashed inventory.
- Dataset metadata, validator index and shards schema 5. Metadata filters equal
  `serviceType: resource-manager` plus `corpus`; metadata/baseline project records
  cover the same complete project/version inventory. Each record has `apiVersion`,
  successful compilation/validation and retained Swagger whose `info.version`
  matches. Repeated project paths are allowed only for different versions.
- The existing metadata summary fields count distinct projects and total Swagger
  files/findings; an additional `projectVersions` field counts completed pairs.
  Each validator finding includes its project and `apiVersion`. Versionless or
  out-of-population observations fail verification, not attribution to a guess.

These formats are implemented in the skill's recovery helper, **not** in the
current package generator/native analyzer. Keep exact allowlist selection,
all-version generation, private-format production and native-loader support as
explicit runtime prerequisites. Do not convert a latest-only run into these
formats by changing schema numbers or claiming missing versions passed.

## Authorized producer procedure

1. Verify the private publication binding, repository policy, source snapshot,
   comment/allowlist and complete supported-version inventory. Inspect runner
   capabilities and profile controls; record cost/budget. Missing runtime
   support stops before generation. A consumer invocation cannot become a
   producer implicitly.
2. Resolve the authorized `RPSaaSMaster` source once. Generate Swagger and
   Swagger-linter observations once across the frozen selection. Retain all
   input/runtime/activation receipts and failures. Seal only a complete,
   zero-failure population with matching version identities and file hashes.
3. Use a new baseline ID, immutable descriptor and checksummed archive/release.
   Preserve the exact specs source SHA privately. Never write generated data to
   the source branch, overwrite prior assets or force-push metadata.
   If the metadata branch does not exist, only the authorized producer creates
   it from the frozen source commit in its isolated private worktree, after
   ownership/collision and publication-policy checks. Consumers never create it.
4. Publish the immutable version descriptor and a version-specific
   `discovery.json` beside it on the verified metadata branch. Its fields use
   the discovery schema above. Publish the archive to the descriptor's private
   repository/release. Do not advance `current.json` yet.
5. Pin that metadata commit using `discover --path` with the version-specific
   discovery path, then run `fetch --binding` below. Verify a download/hash
   round trip and isolated recovery of source/inputs with authorized credentials.
   Check descriptor hashes against actual Git blob bytes. Merely creating a
   branch or release is not successful baseline publication.
6. Only after these checks pass, advance private `current.json` to that exact
   descriptor and verify remote readback. Record the resulting metadata SHA.
   Retain old versions; consumers already running keep their pinned binding.
   Failed or uncertain uploads follow the existing no-blind-retry policy.

This skill supplement does not supply or run the missing package-level producer.

## Deterministic consumer and resumption

From a prepared tooling checkout, use actual new absolute output paths:

```powershell
mise exec -- python -X utf8 -B .github\skills\analyze-native-lint-coverage\shared_baseline.py discover `
  --output C:\dev\worktrees\private-evidence\local\selection
```

`discover` defaults to the explicit binding above. Its optional
`--repository`, `--ref` and `--path` override only that helper's private discovery
location, not queue grammar or analyzer options. It verifies private/read access,
resolves the ref to one commit and reads both JSON files at that commit. It writes
exact `discovery.json`/`descriptor.json` bytes and a schema-1 `binding.json`.
No missing-branch fallback, dataset generation or publication occurs.

After comparing the selected corpus with the task requirements:

```powershell
mise exec -- python -X utf8 -B .github\skills\analyze-native-lint-coverage\shared_baseline.py fetch `
  --descriptor C:\dev\worktrees\private-evidence\local\selection\descriptor.json `
  --binding C:\dev\worktrees\private-evidence\local\selection\binding.json `
  --output C:\dev\worktrees\private-evidence\local\verified-baseline
```

Recovery checks the descriptor/binding identities, archive bytes/hash, full file
inventory, successful project/version population and validator shards/counts.
Private downloads also verify that the archive repository is private/readable.
For retained assets, add `--archive <absolute-existing-archive>`; this recovery
is offline and does not requery moving refs. It does not establish current
remote permissions or authorize publication. Outputs must not already exist.
Keep failed selections/downloads/extractions for diagnosis; never retry against
the public discovery location.

On resume, use the saved descriptor/binding and verified baseline identity.
Do not invoke discovery again or reread `current.json`. Reuse complete local
data read-only only after the normal integrity/compatibility checks.
Give every native comparison a separate writable specs runtime and new output.
When a compatible private-format native runner is available, pass the recovered
`baselineRun` through `--baseline-run` with the supported recorded policy.
That skips Swagger generation/validation, not fresh TypeSpec execution.

Each independent private `migration.md` records the discovery binding, frozen
specs and corpus identities, baseline/archive identity, TypeSpec candidate and
actual replay evidence. Never pool public/private totals or relabel old native
findings as a new candidate run.
