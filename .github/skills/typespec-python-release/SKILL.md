---
name: typespec-python-release
description: "Release @azure-tools/typespec-python after updating @typespec/http-client-python. Use when: preparing, publishing, or creating a PR for a TypeSpec Python emitter release."
---

# TypeSpec Python Release

Prepare a release PR for `@azure-tools/typespec-python` from the repository root.

## Requirements

- Run every command from the repository root.
- Use the current date in `YYYY-MM-DD` format for the branch name.
- Release only `@azure-tools/typespec-python`.
- Do not overwrite an existing branch.

## Workflow

### 1. Create the Branch

1. Create the publish branch using the current date:

   ```bash
   release_date=$(date +%F)
   git switch -c "publish/python-${release_date}"
   ```

   If the branch already exists locally or remotely, stop and ask the user whether to reuse it or choose another date. Do not delete or overwrite it.

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

3. Read the package version again. If Chronus changed it, use the generated changelog entry and do not add another one.
4. If Chronus did not change it:
   - Increment only the patch component in `packages/typespec-python/package.json`, from `a.b.c` to `a.b.(c+1)`.
   - Add this entry immediately below `# Release` in `packages/typespec-python/CHANGELOG.md`. The heading is the new `@azure-tools/typespec-python` package version; the bullet uses `$latest_http_client_python`. These versions are independent and are usually different:

   ```markdown
   ## <new-typespec-python-version>

   - Bump @typespec/http-client-python to <latest-http-client-python-version>
   ```

5. If the manual fallback was used, confirm the final package version is exactly one patch version above the recorded version. Otherwise, confirm Chronus versioned only `@azure-tools/typespec-python`.

### 4. Update and Validate the Lockfile

1. Update dependencies and `pnpm-lock.yaml`:

   ```bash
   pnpm install
   ```

2. Inspect `git diff --check`, `git diff --stat`, and `git status --short`.
3. Verify the release includes only expected files:
   - `pnpm-workspace.yaml`, when its dependency range changed
   - `pnpm-lock.yaml`
   - `packages/typespec-python/package.json`
   - `packages/typespec-python/CHANGELOG.md`
   - TypeSpec Python change files consumed by Chronus, if any

   Stop and investigate before committing if other packages were versioned or unrelated files changed.

### 5. Commit and Create the Pull Request

1. Read the final version from `packages/typespec-python/package.json` and use it as `<version>` below.
2. Stage and commit all changes:

   ```bash
   git add -A
   git commit -m "[python] release <version>"
   ```

3. Push the new branch:

   ```bash
   git push --set-upstream origin "publish/python-${release_date}"
   ```

4. Before creating the pull request, clean the repository and update `main` with this exact sequence:

   ```bash
   git reset HEAD && git checkout . && git clean -fd && git checkout origin/main && git pull origin main
   ```

5. Create a pull request targeting `main` from `publish/python-${release_date}` with this exact title and an empty body:

   ```bash
   gh pr create --repo Azure/typespec-azure --base main --head "publish/python-${release_date}" --title "[python] release <version>" --body ""
   ```

6. Verify the created pull request has the expected title and an empty body:

   ```bash
   gh pr view "publish/python-${release_date}" --repo Azure/typespec-azure --json title,body,url
   ```

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
