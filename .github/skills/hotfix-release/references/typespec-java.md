# Java hotfix release

Supplement the [hotfix-release skill](../SKILL.md)
with these Java-specific steps. The emitter release involves **three PRs and one
SDK sync pipeline run**; the pipeline creates an additional downstream SDK PR.

## 1. Core-sync PR

Target the release branch. Keep the package version unchanged.

- Wait for the upstream fixes to merge, then pin `core-commit.json` to the
  post-merge `microsoft/typespec:main` HEAD. This pin is separate from the `core`
  submodule gitlink.
- Inspect upstream Java changes since the previous pin. Include intended fixes;
  investigate features before including them in a patch release.
- From this package, run `pnpm sync-tests`. Let it finish: it replaces test inputs
  before copying them. Inspect substantive changes separately from line-ending
  noise.
- Check whether upstream changes also require local generation scripts, Spector
  configuration, or emitter options to change.
- Add Chronus `fix` descriptions based on the upstream user-facing changes, with
  source PR links. Do not edit `CHANGELOG.md` in this PR.
- Validate the branded build and relevant generated Java regressions. Run
  `pnpm regenerate -- --parallelization 4` when generation changes.
- Open a draft PR targeting the release branch.

Optional SDK validation against this PR uses pipeline `8274` with
`EmitterVersion=none`, `PRIdOrBranch=<PR number>`, and
`UpgradeDesignatedLibraries=false`. This is separate from the published-version
run below.

## 2. Publish PR

After the core-sync PR merges, follow the skill's publish procedure on a new
branch from the updated release branch. Bump only Java:

```powershell
pnpm chronus version --ignore-policies --only @azure-tools/typespec-java
```

Keep inline upstream source links, but remove leading PR-number links from
generated changelog bullets. Expect only consumed Chronus files, the Java package
version, and its changelog to change; do not change the core gitlink or lockfile.

## 3. Backmerge PR

After the publish PR merges, follow the skill's backmerge procedure. Preserve
main's newer repository structure, scripts, dependencies, lockfile, and core
gitlink while retaining the Java hotfix pin, version, changelog, and regressions.
Do not restore obsolete files removed on main.

Start this track in parallel with package-publication checks.

## 4. Published-version SDK sync

Proceed only when this returns the exact patch version:

```powershell
npm view "@azure-tools/typespec-java@<version>" version --registry https://pkgs.dev.azure.com/azure-sdk/public/_packaging/azure-sdk-for-js/npm/registry/
```

Run Azure DevOps pipeline **8274**, `typespec-java - sync sdk`, in
`azure-sdk/internal`, against `Azure/azure-sdk-for-java:main` with
`EmitterVersion=<version>` and `PRIdOrBranch=none`.

Inspect the complete diff of its generated SDK PR. If anything besides
`eng/emitter-package.json` and `eng/emitter-package-lock.json` changes, obtain
explicit user review before approving or merging. Otherwise, follow repository
approval and merge requirements; do not use auto-merge to wait for every requested
owner.

The hotfix is complete only after publication, the backmerge actually lands on
main, and the SDK sync succeeds with its generated PR merged.
