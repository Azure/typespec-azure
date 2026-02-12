---
name: hotfix-release
description: Publish a hotfix (patch) release for one or more packages from an existing release branch. Use when the user wants to kick, start, or perform a hotfix release on a release/* branch.
---

# Hotfix Release

Instructions for publishing a hotfix (patch) release for one or more packages from an existing `release/*` branch.

> ⚠️ **Prerequisites:** A `release/<sprint-name>` branch must already exist with the fix commit(s) merged into it. If it does not exist, create one from the last release tag commit first.
> See [CONTRIBUTING.md](../../CONTRIBUTING.md#make-a-patch-release) for the full process context.

## REQUIRED PARAMETERS

Before starting, confirm the following with the user:

- **Release branch name:** e.g. `release/february-2026`
- **Package(s) being hotfixed:** one or more packages, e.g.
  - `@azure-tools/typespec-client-generator-core` (tcgc)
  - `@azure-tools/typespec-azure-core` (azure-core)
  - `@azure-tools/typespec-autorest` (autorest)

## REQUIRED STEPS (ALL MUST BE COMPLETED IN ORDER)

### 1. PREPARATION

1. Fetch the release branch:

   ```bash
   git fetch origin release/<sprint-name>
   ```

2. Verify the fix commit is present on the release branch:

   ```bash
   git log origin/release/<sprint-name> --oneline -10
   ```

### 2. CREATE HOTFIX PUBLISH BRANCH

1. Create a new branch from the release branch. Use a name that reflects the package(s) being hotfixed:

   ```bash
   git checkout -b publish/hotfix/<name>-<sprint-name> origin/release/<sprint-name>
   ```

   Naming convention:
   - **Single package:** use the package shortname, e.g. `publish/hotfix/tcgc-february-2026`
   - **Multiple packages:** use a descriptive group name, e.g. `publish/hotfix/tcgc-and-azure-core-february-2026`
   - **All packages:** use a general name, e.g. `publish/hotfix/all-february-2026`

2. Ensure the `core` submodule is at the correct commit for this branch:

   ```bash
   git submodule update --init
   ```

### 3. Run the version bump command with `--ignore-policies` (required for hotfix releases since the release branch is not `main`):

   ```bash
   pnpm chronus version --ignore-policies
   ```

3. **IMPORTANT:** If the `core` submodule pointer was changed by the version bump, reset it — the submodule should NOT change in a hotfix:

   ```bash
   git checkout -- core
   ```

4. Verify only the intended files are changed:

   ```bash
   git diff --stat
   ```

   You should see ONLY (repeated per hotfixed package):
   - Deleted `.chronus/changes/<file>.md` (one per fix)
   - Modified `packages/<package-name>/package.json`
   - Modified `packages/<package-name>/CHANGELOG.md`

> ⚠️ If any packages were bumped that are NOT in the hotfix target list, investigate before proceeding.

### 4. COMMIT AND PUSH

1. Commit the version bump:

   ```bash
   git add -A
   git commit -m "Bump version for hotfix: <pkg1>@<version1>, <pkg2>@<version2>, ..."
   ```

   Examples:
   - Single: `"Bump version for hotfix: tcgc@0.65.1"`
   - Multiple: `"Bump version for hotfix: tcgc@0.65.1, azure-core@1.2.1"`

2. Push the branch:

   ```bash
   git push origin publish/hotfix/<name>-<sprint-name>
   ```

### 5. CREATE PR AND MERGE

1. Open a PR from `publish/hotfix/<name>-<sprint-name>` targeting `release/<sprint-name>` (NOT `main`)
2. Wait for CI to pass
3. **Squash merge** the PR
4. The publish pipeline will automatically release the new package version(s) to NPM

### 6. BACKMERGE TO MAIN

After the hotfix PR is merged:

1. A workflow should automatically create a backmerge branch named `backmerge/release/<sprint-name>-YYYY-MM-DD`
2. Find the backmerge branch at https://github.com/Azure/typespec-azure/branches
3. Open a PR from the backmerge branch targeting `main`
4. **Rebase merge** the backmerge PR into `main`

> ⚠️ The backmerge ensures the hotfix and version bump are reflected in `main`. Do NOT skip this step.

## IMPORTANT REMINDERS

- ⚠️ The PR MUST target `release/<sprint-name>`, NOT `main`
- ⚠️ Always use `--ignore-policies` with `pnpm chronus version` on release branches
- ⚠️ Always reset the `core` submodule pointer if it was changed (`git checkout -- core`)
- ⚠️ Only the targeted package(s) should have version changes — verify with `git diff --stat`
- ⚠️ Always complete the backmerge to `main` after the hotfix is published
- ⚠️ If the `release/<sprint-name>` branch does not exist yet, create it from the last release tag commit before starting
