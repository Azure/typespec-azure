---
name: typespec-python-release
description: "Release @azure-tools/typespec-python after updating @typespec/http-client-python. Use when: preparing, publishing, or creating a PR for a TypeSpec Python emitter release."
---

# TypeSpec Python Release

Prepare a release PR for `@azure-tools/typespec-python` from the repository root.

## Requirements

- Run every command from the repository root.
- Release only `@azure-tools/typespec-python`.
- Use the task branch supplied by the environment when available. Do not require a particular branch name or ask the user to choose one.
- Do not delete or overwrite an existing branch.
- Use any available authenticated integration to publish the branch and create the pull request; do not assume GitHub CLI is installed or authenticated.

## Workflow

### 1. Prepare the Repository and Task Branch

1. If the environment has already supplied a task branch (for example, a cloud agent branch), work on that branch and skip the cleanup and checkout sequence below. Preserve existing task changes.
2. Otherwise, clean the repository and update `main` with this exact sequence:

   ```bash
   git reset HEAD && git checkout . && git clean -fd && git checkout origin/main && git pull origin main
   ```

   This intentionally discards all uncommitted tracked and untracked files. Run it only when the user has asked to start the release workflow.

3. If no task branch was supplied, create a new branch from the clean, updated `origin/main` checkout. Choose an unused branch name without asking the user; do not delete or overwrite existing local or remote branches.
4. Record the actual task branch name for publishing and PR verification:

   ```bash
   release_branch=$(git branch --show-current)
   ```

### 2. Update `@typespec/http-client-python`

1. Read the latest published version from npm:

   ```bash
   latest_http_client_python=$(pnpm view @typespec/http-client-python version)
   ```

2. In the root `pnpm-workspace.yaml`, update only the lower bound of the catalog entry for `@typespec/http-client-python` to that exact version. Preserve the existing upper bound. For example:

   ```yaml
   "@typespec/http-client-python": ">=0.37.2 <1.0.0"
   ```

3. Verify the edited lower bound equals `$latest_http_client_python`. If it was already current, continue with the release and report that no dependency edit was needed.

### 3. Version TypeSpec Python

1. Record the current version from `packages/typespec-python/package.json`.
2. Run Chronus for only the Python emitter:

   ```bash
   pnpm chronus version --only @azure-tools/typespec-python
   ```

3. Check Chronus's exit status and inspect its changes before reading the package version again. If it fails, report the error and investigate any partial changes; do not treat a partial version bump as a successful release. If it left the package and changelog unchanged, continue with the manual fallback below. If Chronus succeeds and changed the version, use the generated changelog entry and do not add another one.
4. If Chronus did not change it:
   - Increment only the patch component in `packages/typespec-python/package.json`, from `a.b.c` to `a.b.(c+1)`.
   - Add this entry immediately below `# Release` in `packages/typespec-python/CHANGELOG.md`. The heading is the new `@azure-tools/typespec-python` package version; the bullet uses `$latest_http_client_python`. These versions are independent and are usually different:

   ```markdown
   ## <new-typespec-python-version>

   - Bump @typespec/http-client-python to <latest-http-client-python-version>
   ```

5. If the manual fallback was used, confirm the final package version is exactly one patch version above the recorded version. Otherwise, confirm Chronus versioned only `@azure-tools/typespec-python`.

### 4. Update Documentation and Validate the Lockfile

1. Update dependencies and `pnpm-lock.yaml`:

   ```bash
   pnpm install
   ```

2. After installation, build the Python emitter and its workspace dependencies, then regenerate documentation only for `packages/typespec-python`. The dependency build is required in fresh worktrees, where the documentation script's package-only build otherwise fails with missing workspace module declarations. Run these commands from the repository root; `--dir` runs the documentation script in the Python package:

   ```bash
   pnpm -r --filter "@azure-tools/typespec-python..." build
   pnpm --dir packages/typespec-python run regen-docs
   ```

3. After versioning and documentation generation, add an `internal` change description for only the Python emitter:

   ```bash
   pnpm change add @azure-tools/typespec-python --kind internal --message "Release @azure-tools/typespec-python <version> with @typespec/http-client-python <latest-http-client-python-version>."
   ```

   Replace the placeholders with the final package version and dependency version. Inspect `.chronus/changes/` to verify that the command actually created a valid change file; an exit status of zero is not sufficient. Chronus can print `No package changed. Exiting.` and create no file when the release edits are still uncommitted. If the command fails or creates no valid file, report the outcome and manually create a uniquely named `.md` file under `.chronus/changes/` if needed, using this format:

   ```markdown
   ---
   changeKind: internal
   packages:
     - "@azure-tools/typespec-python"
   ---

   Release @azure-tools/typespec-python <version> with @typespec/http-client-python <latest-http-client-python-version>.
   ```

   Verify the file has `changeKind: internal` and lists only `@azure-tools/typespec-python`. Do not rerun Chronus versioning after adding it; the file must remain in the release PR.

4. Inspect `git diff --check`, `git diff --stat`, and `git status --short`.
5. Verify the release includes only expected files:
   - `pnpm-workspace.yaml`, when its dependency range changed
   - `pnpm-lock.yaml`
   - `packages/typespec-python/package.json`
   - `packages/typespec-python/CHANGELOG.md`
   - `packages/typespec-python/README.md`
   - `website/src/content/docs/docs/emitters/clients/typespec-python/reference/emitter.md`
   - TypeSpec Python change files consumed by Chronus, if any
   - The new `internal` TypeSpec Python change file under `.chronus/changes/`

   Stop and investigate before committing if other packages were versioned or unrelated files changed.

### 5. Commit and Create the Pull Request

1. Read the final version from `packages/typespec-python/package.json` and use it as `<version>` below.
2. Stage and commit the validated release changes, including the new `internal` change file:

   ```bash
   git add -A
   git commit -m "[python] release <version>"
   ```

3. Publish the actual task branch using an available authenticated mechanism, such as Git, an MCP integration, or the cloud agent's publishing workflow. Use a personal fork when required by repository permissions. Do not assume the remote is named `origin` or the branch follows a particular naming convention.
4. Create a pull request against `Azure/typespec-azure`, targeting `main` from the published task branch, with the exact title `[python] release <version>` and an empty body. Choose an available authenticated tool or integration; GitHub CLI is optional. If publishing or PR creation is unavailable, stop and report the blocker so the user can finish.
5. Verify the created pull request's repository, base and head branches, exact title, empty body, and inclusion of the new `internal` change file using the available integration.

### 6. Review and Improve the Process

1. After the pull request is created, review the complete release run: commands executed, command output, manual interventions, validation results, changed files, commit, push, cleanup, and PR creation.
2. Update this skill only when the completed run provides a concrete finding and a strong reason for the change, such as:
   - A documented step failed or produced an incorrect result.
   - The agent needed an undocumented manual correction to complete the release.
   - A step was ambiguous enough to create a real risk or delay.
   - A command was unnecessary or could be replaced by a demonstrably safer or more reliable command.
3. Do not change the skill based on preference, speculation, or an unobserved edge case. For every update, record the observed evidence and explain why the edit improves future releases.
4. Keep any skill update minimal, validate its formatting and frontmatter, and keep it separate from the completed release PR unless the user explicitly asks to include it there.
5. If the review finds no evidence-backed improvement, leave the skill unchanged and state that no update was warranted.
6. Return the branch name, released package version, `@typespec/http-client-python` version, commit hash, pull request URL, review findings, and any skill update to the user.
