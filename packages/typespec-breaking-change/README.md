# TypeSpec breaking-change CLI

This prototype analyzes the HTTP API described by a versioned TypeSpec service.
It compares version projections, classifies detected differences, applies explicit
approvals, and produces reports for local review or CI. It analyzes the API
contract, not generated SDKs or a textual diff of TypeSpec files.

> **Prototype status:** Behavior and coverage are still evolving. In the current
> prototype base, the [compile wrapper](./src/cli/compile.ts) still injects the
> removed breaking-change library entrypoint following the move to Azure.Core.
> Compilation-based CLI runs can fail until that integration is updated. The
> usage below describes the implemented CLI interface; it is not a claim that
> end-to-end execution is currently unblocked.

## Prerequisites and build

Use the development tool versions pinned by this repository. From the repository
root, install dependencies and build the tool and its dependencies:

```powershell
mise install
mise exec -- pnpm install
mise exec -- pnpm -r --filter "@azure-tools/typespec-breaking-change..." build
```

For a fresh checkout, run `mise trust` first if mise reports that the configuration
is untrusted. See [CONTRIBUTING.md](../../CONTRIBUTING.md) for repository setup.

The package exposes the `typespec-breaking-change` executable. The examples below
invoke its built entrypoint directly from the repository root:

```powershell
mise exec -- node .\packages\typespec-breaking-change\dist\src\cli\cli.js --help
```

The specification needs its own dependencies installed and resolvable. Analysis
uses the compiler's no-emit mode and does not run SDK emitters. Git must be
available when using `--base-ref`.

## What is compared?

The tool discovers versioned services declared with `@service` and `@versioned`.
Services without versioning metadata are not analyzed. A successful run with no
findings is not proof of compatibility: check that the report contains the
expected services and version comparisons.

| Mode                 | Inputs                         | Comparisons                                                                                                                            |
| -------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Single specification | Head folder or entrypoint only | Cross-version comparisons within the head specification.                                                                               |
| Two specifications   | Head plus `--base`             | Same-version comparisons across the two specifications, followed by cross-version comparisons within head for new or changed versions. |
| Git baseline         | Head plus `--base-ref`         | The two-specification workflow, with baseline source checked out automatically.                                                        |

**Same-version comparisons** compare the base and head projections of each API
version present in both specifications. They detect changes to an existing API
version even when no new version has been added. Detected differences are
classified as errors unless explicitly approved.

**Cross-version comparisons** compare a candidate API version with the previous
stable version in the head specification's version order. Versions ending in
`-preview` are treated as preview; other versions are treated as stable. A
candidate without a preceding stable version produces no comparison.

With a single specification, every version is a candidate. With a baseline, the
candidates are newly added versions and versions with differences detected by
same-version comparison. Using `--phase cross-version` skips same-version
comparison, so only newly added versions are candidates in baseline mode.
Using `--phase same-version` without a baseline produces no comparisons.

Cross-version findings are classified according to request and response
compatibility rules. For example, removing a response property is an error,
whereas adding one is generally ignored. A property shared by request and
response may be reported as a resource-property change. The
[rule catalog](./src/rule-catalog.ts) distinguishes emitted, derived, and
declared-only kinds; the existence of a kind does not mean every occurrence is
currently detected.

## Usage

Paths are resolved relative to the current working directory. A positional path
can identify a TypeSpec project folder containing `main.tsp`; use `--entry` for an
explicit head entrypoint.

### Compare versions in one specification

```powershell
mise exec -- node .\packages\typespec-breaking-change\dist\src\cli\cli.js .\specification\Widget
```

This checks compatibility across versions declared in that specification. It
does not compare against Git history.

### Compare two source trees

```powershell
mise exec -- node .\packages\typespec-breaking-change\dist\src\cli\cli.js --entry .\head\main.tsp --base .\base\main.tsp
```

Both trees must have resolvable TypeSpec imports. Explicit `--base` takes
precedence over `--base-ref` if both are supplied.

### Compare with a Git revision

```powershell
mise exec -- node .\packages\typespec-breaking-change\dist\src\cli\cli.js .\specification\Widget --base-ref origin/main
```

The revision must already be available in the repository containing the head
path. Fetch it yourself if necessary; the CLI does not fetch remote history.
For reproducible CI comparisons, pass the intended baseline commit SHA.

The CLI creates a detached temporary worktree, maps the head path to the same
repository-relative baseline path, and removes the worktree when analysis
finishes. Sparse checkout limits the materialized source to the selected scope,
including nearby folders for sibling imports. It does not modify the caller's
source tree. A missing baseline path falls back to single-specification analysis,
as when a specification folder is newly introduced.

### Write CI reports

```powershell
mise exec -- node .\packages\typespec-breaking-change\dist\src\cli\cli.js .\specification\Widget --base-ref origin/main --json-output .\reports\breaking-changes.json --markdown-output .\reports\breaking-changes.md --github-annotations --fail-on-breaking
```

Report parent directories are created automatically. Upload or publish the files
in your workflow; the CLI does not post a pull-request comment itself.

## Options

| Option                     | Meaning                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `--entry`, `-e <path>`     | Head TypeSpec entrypoint; alternatively supply a positional project path.                                                 |
| `--base`, `-b <path>`      | Baseline TypeSpec entrypoint or project path.                                                                             |
| `--base-ref <revision>`    | Baseline Git commit, branch, or tag; ignored when `--base` is supplied.                                                   |
| `--phase`, `-p <value>`    | Restrict comparisons to `same-version` or `cross-version`; by default run the comparisons supported by the selected mode. |
| `--service`, `-s <name>`   | Filter services by a case-sensitive substring of the service namespace's simple name.                                     |
| `--format`, `-f <value>`   | Terminal report format: `console` (default), `json`, or `github` (Markdown).                                              |
| `--json-output <path>`     | Write a JSON report independently of the terminal format.                                                                 |
| `--markdown-output <path>` | Write a detailed Markdown summary independently of the terminal format.                                                   |
| `--github-annotations`     | Emit GitHub Actions `::error` annotations for unsuppressed error findings.                                                |
| `--show-suppressed`        | Include approved findings in the console-format report.                                                                   |
| `--show-ignored`           | Include ignored findings in the console-format report.                                                                    |
| `--fail-on-breaking`       | Also return exit code `1` when findings are suppressed by approvals; see exit codes below.                                |
| `--report-title <title>`   | Set the H2 title for `--markdown-output`; default: `Breaking Change Analysis`.                                            |
| `--omit-title`             | Omit that Markdown file's H2 title, useful when a workflow supplies its own heading.                                      |
| `--help`, `-h`             | Print usage and exit.                                                                                                     |

Progress messages are written to standard output along with the terminal report.
Use `--json-output` rather than redirecting `--format json` output when a consumer
requires a standalone JSON document. The display flags do not change analysis,
approval matching, or exit status; they are not filters for the JSON or detailed
Markdown files.

For Markdown source links, GitHub Actions can provide `GITHUB_SERVER_URL`,
`GITHUB_REPOSITORY`, `GITHUB_SHA`, and `GITHUB_WORKSPACE`. Outside Actions, the
workspace path falls back to the Git repository root when available.
`VIOLATIONS_REFERENCE_URL` overrides the detailed Markdown report's
violation-reference link.

## Approving intentional changes

Approval decorators belong to Azure.Core, not this CLI package. Import
`@azure-tools/typespec-azure-core` in the specification and use
`Azure.Core.approvedBreakingChange` for cross-version changes or
`Azure.Core.approvedUnversionedChange` for same-version changes.

Each approval requires a reason. Optional `kind` restricts it to a finding kind;
`path` selects a finding relative to the decorated declaration and is required
for an approval placed on an ancestor rather than directly on the finding's
target. Use the report's suggested approval and path to locate the appropriate
declaration.

For cross-version approvals, optional `since` currently matches the **exact head
API version**, not a lower bound. Scope approvals to the intended version:
an unscoped approval that matches multiple baseline versions can be reported as
ambiguous rather than accepted. Same-version approvals do not have a `since`
option. See the [Azure.Core decorator reference](../typespec-azure-core/README.md#decorators)
for signatures and supported targets.

Approved findings remain available for review; approval is not equivalent to
deleting a finding. Reports can include approval classification and review-label
recommendations, but the CLI does not apply GitHub labels.

## Exit codes

| Code | Current behavior                                                                                                                       |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | Analysis completed with no unsuppressed errors, and `--fail-on-breaking` did not reject suppressed findings.                           |
| `1`  | At least one unsuppressed error exists, **even without** `--fail-on-breaking`; with that flag, any suppressed finding also causes `1`. |
| `2`  | Missing entrypoint or an analysis failure, such as compilation, checkout, or report-writing failure.                                   |

The prototype's help text describes `--fail-on-breaking` more narrowly than the
implementation. Do not rely on omitting the flag to make detected errors return
`0`. Compilation errors stop analysis instead of being reported as no changes.

## Baseline dependencies and limitations

`--base-ref` checks out historical **source**, not a historical toolchain. The
checkout helper attempts to link the head repository root's `node_modules` into
the temporary worktree. It does not install dependencies from the baseline
lockfile or reproduce historical compiler output. If dependencies are installed
only in nested project folders, ensure baseline imports can still resolve.

Using one installed toolchain helps isolate source/API changes from dependency
changes. A compiler or library upgrade can nevertheless make older source fail
to compile or affect the API it describes. Review dependency upgrades separately;
TypeSpec compatibility is not a guarantee that every historical specification
compiles unchanged.

Other current prototype limitations:

- Dependency-link failures are best-effort in the current base, and baseline-path
  access failures can trigger the missing-baseline fallback. Inspect the reported
  comparison set instead of treating a clean result as evidence that the baseline
  was analyzed.
- Sparse checkout may omit imports outside the selected source scope. Use an
  explicitly prepared baseline with `--base` when broader source layout is needed.
- Only supported HTTP contract differences are detected. This is not a complete
  semantic or generated-client compatibility guarantee.
- Console progress and some report metadata still use internal terminology.
  The public comparison modes are `same-version` and `cross-version`.
