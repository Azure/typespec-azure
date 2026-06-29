# regen-diff — shared generated-test diff previews

A small, self-contained tool that lets any TypeSpec **emitter language** preview
the impact of a change on its generated test output, the same way the Azure SDK
[test-proxy](https://github.com/Azure/azure-sdk-tools/blob/main/tools/test-proxy/README.md)
externalizes recordings.

Instead of committing a large generated-test tree (or force-pushing it to a side
branch), the **baseline** ("last accepted output") lives in an external, public
**assets repo**, pinned by a tag in an `assets.json` file (test-proxy
convention). On every PR the emitter is regenerated, diffed against the restored
baseline, rendered to **HTML**, published to **GitHub Pages**, and linked from a
**sticky PR comment** plus a `regen-diff/<slug>` commit status.

```
PR touches packages/<emitter>/**
        │
        ▼
<lang>-regen-diff.yml  (pull_request, read-only token)
  build → regenerate → render HTML diff → upload artifact
        │
        ▼  workflow_run (base-repo context, GITHUB_TOKEN write)
regen-diff-publish.yml  (shared, language-agnostic)
  publish to gh-pages: pr/<num>/<slug>/  ·  sticky comment  ·  commit status
```

Everything uses only the built-in `GITHUB_TOKEN` (no PAT / extra secret) and is
safe for fork PRs.

## Layout

| Path                                            | What it is                                                   |
| ----------------------------------------------- | ------------------------------------------------------------ |
| `eng/common/scripts/regen-diff/`                | This shared tool (one copy, used by every language).         |
| `packages/<emitter>/assets.json`                | Baseline pointer (assets repo + pinned tag).                 |
| `packages/<emitter>/regen-diff.config.json`     | Per-language config (slug, flavors, generated dir, title).   |
| `.github/workflows/<lang>-regen-diff.yml`       | Thin per-language workflow: build → regenerate → render.     |
| `.github/workflows/regen-diff-publish.yml`      | Shared: publish to Pages + comment + status.                 |
| `.github/workflows/regen-diff-cleanup.yml`      | Shared: remove a PR's preview on close.                      |

## CLI

```
tsx eng/common/scripts/regen-diff/src/cli.ts <command> --package <dir> [options]
```

| Command       | Purpose                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `render`      | Render the HTML diff (current generated output vs the assets baseline). |
| `push-assets` | Publish the current output as a new baseline and bump `assets.json`.    |

`render` options: `--output <dir>`, `--generated <dir>`, `--title <text>`,
`--open` (browser), `--vscode` (native side-by-side editor diffs), `--max <n>`.
`push-assets` options: `--message <msg>`, `--branch <name>`, `--dry-run`.

The tool has its own `package.json`/`package-lock.json`, so it is **independent
of the consuming package's package manager** (npm, pnpm, …). Install its deps once with `npm install` in this directory before running it.

## Onboarding a new emitter language

1. **Pick an assets repo + prefix.** It must be a public repo you can push tags
   to. Use a unique `AssetsRepoPrefixPath` so languages don't collide. Add
   `packages/<emitter>/assets.json`:

   ```json
   {
     "AssetsRepo": "<owner>/<assets-repo>",
     "AssetsRepoPrefixPath": "<lang>",
     "TagPrefix": "<lang>/tests",
     "Tag": ""
   }
   ```

   Leave `Tag` empty until you bootstrap (step 4); the diff then shows the whole
   output as "added", which is harmless.

2. **Describe the output.** Add `packages/<emitter>/regen-diff.config.json`:

   ```json
   {
     "slug": "<lang>",
     "title": "<Lang> emitter — generated test diff",
     "generatedDir": "tests/generated",
     "flavors": ["azure", "unbranded"],
     "pruneFilePrefixes": []
   }
   ```

   - `slug` — URL/identifier-safe, namespaces the Pages folder + status context.
   - `flavors` — the top-level folders under `generatedDir` that make up the
     baseline (use `["."]` if there's a single flat tree).
   - `pruneFilePrefixes` — filename prefixes to drop as transient codegen noise
     (e.g. `[".tsp-codegen-"]`); leave `[]` if none.

3. **Wire up scripts** in `packages/<emitter>/package.json` (paths are relative
   to the package; adjust depth as needed):

   ```jsonc
   "regenerate:render-diff": "tsx ../../eng/common/scripts/regen-diff/src/cli.ts render --package .",
   "regenerate:diff":        "tsx ../../eng/common/scripts/regen-diff/src/cli.ts render --package . --open",
   "regenerate:vscode-diff": "tsx ../../eng/common/scripts/regen-diff/src/cli.ts render --package . --vscode",
   "regenerate:review":      "<regenerate> && <regenerate:diff>",
   "regenerate:push-assets": "tsx ../../eng/common/scripts/regen-diff/src/cli.ts push-assets --package ."
   ```

4. **Bootstrap the baseline** (maintainer, local, one time). Generate the output
   and publish the first tag:

   ```bash
   <your regenerate command>
   npm install --no-package-lock --prefix eng/common/scripts/regen-diff
   <your regenerate:push-assets>     # pushes a tag to the assets repo + bumps assets.json
   ```

   Commit the updated `assets.json` (its `Tag` now points at the baseline).

5. **Add the diff workflow** `.github/workflows/<lang>-regen-diff.yml` — copy
   `python-regen-diff.yml` and adapt the build/regenerate steps + the
   `paths:` filter to your package. It must:
   - run `npm install` in `eng/common/scripts/regen-diff` before rendering,
   - render with `--output "${{ runner.temp }}/diff-site"`,
   - write the PR number to `diff-site/pr.txt`,
   - upload the artifact as **`regen-diff-site`**.

6. **Register with the shared publish workflow.** Add your diff workflow's
   `name:` to the `workflow_run.workflows` list in `regen-diff-publish.yml`.
   The shared cleanup workflow already matches `packages/http-client-*/**`; add
   your package glob there too if it lives elsewhere.

7. **Enable GitHub Pages** (gh-pages branch) on the repo if it isn't already,
   and optionally make `regen-diff/<slug>` a required status via branch
   protection so a drift without an `assets.json` bump blocks merge.

## Local developer experience

```bash
npm install --no-package-lock --prefix eng/common/scripts/regen-diff   # one time
<your regenerate command>                       # produce fresh output
<your regenerate:diff>                           # render + open the HTML diff
# or:  <your regenerate:vscode-diff>             # open native VS Code diffs
```

No token is needed — the baseline is restored with an anonymous clone of the
public assets repo. When the changes are intentional, run `regenerate:push-assets`
to refresh the baseline and bump `assets.json`, then commit it so the check
passes with **0 differences**.

## Notes

- The renderer is fully generic: it groups changed files by folder, paginates a
  side-by-side page per file, and bounds memory by capping per-file render size.
- `assets.ts` here is a self-contained copy of the test-proxy restore helper.
  Emitters whose `regenerate` step also seeds a baseline (e.g. legacy smoke
  tests) keep their own small `assets.ts`; this tool does not depend on it.

