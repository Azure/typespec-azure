# @azure-tools/emitter-diff

A language-agnostic tool for **diffing the generated code produced by two versions of a
TypeSpec emitter** — and optionally running that emitter's generated-code test suites.

It generates code from the test specs twice (a **baseline** emitter and a **head** emitter),
then shows the diff between the two outputs. Use it locally during development and in CI on PRs.

Each language emitter (python, and later java/rust/go/ts) plugs in via a small **adapter** that
wraps that emitter's own generation/test commands. The core (ref resolution, diffing, orchestration)
contains no language-specific logic.

## How it works

```
            baseline emitter ─┐
                              ├─ generate (adapter) ─► <work>/baseline ─┐
   specs ─────────────────────┤                                        ├─► git diff ─► terminal / HTML
                              ├─ generate (adapter) ─► <work>/head ─────┘
            head emitter ─────┘                                        └─► (optional) run test suites
```

- The **adapter** wraps the emitter's existing commands. For python that is
  `eng/scripts/regenerate.ts` (generation) and `eng/scripts/ci/run-tests.ts` (suites).
- The regenerate _driver_ always comes from the current checkout; only the emitter build it points
  at (`--emitter-dir`) changes between baseline and head, isolating the diff to emitter behavior.

## Usage

```bash
# From the repo root, via pnpm:
pnpm --filter @azure-tools/emitter-diff exec tsx src/cli.ts --emitter python --baseline 0.61.2

# Or directly with Node 22+ (native TS):
npx tsx eng/emitter-diff/src/cli.ts --emitter python --baseline 0.61.2
```

### Refs (`--baseline`, `--head`, `--specs`)

| Syntax                            | Meaning                                |
| --------------------------------- | -------------------------------------- |
| `npm:1.2.3` or `1.2.3`            | a published package version (prebuilt) |
| `local:/path` or `./path`         | a local source folder                  |
| `github:owner/repo@<sha\|branch>` | a GitHub source at a ref               |
| `gh:<sha\|branch>`                | the current repo at a ref              |

`--head` defaults to the **current checkout**. `--specs` defaults to **all** repo specs.

### Common options

By default the tool writes a **clickable HTML report** (`emitter-diff.html`) into the work dir and
prints a `file://` link to it. Use `--terminal` for the full patch in your shell, or
`--patch`/`--html` to write to a specific file.

| Option                  | Description                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `--name <pattern>`      | Filter which specs/packages are generated                                             |
| `--html <file>`         | Write the rendered HTML report to this path (default: `<work-dir>/emitter-diff.html`) |
| `--terminal`            | Print the full colored patch to the terminal instead                                  |
| `--patch <file>`        | Write the raw unified diff to a file                                                  |
| `--fail-on-diff`        | Exit non-zero when output differs (CI gating)                                         |
| `--run-tests`           | Run the adapter's test suites on the output                                           |
| `--test-env <csv>`      | Suites to run, e.g. `test,lint,mypy,pyright`                                          |
| `--test-target <which>` | `head` (default) \| `baseline` \| `both`                                              |
| `--opt key=value`       | Repeatable adapter-specific option (e.g. `--opt flavor=azure`)                        |
| `-- <args>`             | Everything after `--` is forwarded to the adapter                                     |

### Examples

```bash
# Default: writes a clickable emitter-diff.html and prints a file:// link.
npx tsx eng/emitter-diff/src/cli.ts --emitter python --baseline 0.61.2 \
  --opt flavor=azure --name authentication-api-key

# Compare two source folders and write an HTML report to a specific path:
npx tsx eng/emitter-diff/src/cli.ts --emitter python \
  --baseline local:/path/to/old/typespec-python \
  --head local:/path/to/new/typespec-python \
  --html diff.html

# Diff against a GitHub sha and run pytest + type checks on the head output:
npx tsx eng/emitter-diff/src/cli.ts --emitter python \
  --baseline github:Azure/typespec-azure@ \
  --test-env test,mypy,pyright --opt flavor=azure < sha > --run-tests
```

## CI integration

`.github/workflows/ci-emitter-diff-python.yml` runs on PRs that touch the python emitter or this
tool. It diffs the PR's checkout against the emitter as of the PR's **merge-base** with its base
branch (the base-branch commit the PR is based on, which survives squash-merge / rebase /
force-push, unlike a pinned SHA). It then:

- uploads the rendered **`emitter-diff-html`** artifact (full side-by-side diff; downloadable from
  the workflow run — GitHub artifacts are zip downloads, so they can't be rendered inline in a
  comment),
- writes a job-summary with the diff totals, and
- posts a **sticky PR comment** (updated in place on each push) listing the changed files and
  `+`/`-` counts with a link to download the artifact.

This check is **informational** — it never fails the PR; it only reports the generated-output diff
so reviewers can eyeball it. The comment step needs `pull-requests: write`. PRs **from forks** get a
read-only token, so the comment is best-effort there (`continue-on-error`) — the artifact and
job-summary still work.

## Adding a new language adapter

1. Implement `EmitterAdapter` (`src/types.ts`) — `prepareEmitter`, `generate`, optional `runTests` —
   wrapping that emitter's own commands (e.g. rust's `npm run tspcompile`, ts's `gen-spector`).
2. Register it in `src/registry.ts`.

The core needs no changes.

## Notes & limitations

- Baseline from an **npm version** is fastest (ships a prebuilt `dist`). Building a baseline from
  **source** (`local`/`github`) requires a working build of that package.
- External `--specs` folders must mirror the `http-specs` / `azure-http-specs` layout.
- `--html` uses the optional `diff2html` dependency (declared in this package's `package.json`).
- **Windows / constrained Python toolchain:** the python emitter formats output with native
  `black`, which can fail to load on Windows when the package path exceeds the 260-char limit
  (`DLL load failed ... filename or extension is too long`). To avoid this, the **python adapter
  defaults to Pyodide (WASM) generation on Windows** and native generation elsewhere (Linux CI is
  faster natively). Override with `--opt pyodide=true|false`, or forward `-- --use-pyodide` to the
  driver explicitly, e.g.
  `emitter-diff --emitter python --baseline npm:latest --opt pyodide=true`.
