# Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Package layout

`@azure-tools/typespec-java` is the branded Java emitter. It wraps the unbranded emitter
`@typespec/http-client-java`, which lives in the `core/` submodule at
`core/packages/http-client-java`.

Only `src/options.ts` (the Azure-specific emitter options) is committed in this package. The rest of
the emitter TypeScript (and tests) is copied from `core/packages/http-client-java/emitter/{src,test}`
at build time by `Copy-Sources.ps1` (excluding `options.ts`). The Java `emitter.jar` is
built by `Build-Generator.ps1` from a patched copy of `core/packages/http-client-java/generator`
(see below) and staged into `generator/http-client-generator/target/`.

### Azure customization patch

`Copy-Sources.ps1` copies the Java generator sources out of the `core/` submodule into this
package's `./generator` folder and applies `core.patch` to that **copy** — never to `core/` itself.
The patch swaps the unbranded customization engine in `http-client-generator-core` for Azure's
`com.azure.tools:azure-autorest-customization` (resolved from Maven Central), so the
`customization-class` emitter option runs against the Azure customization base. `Build-Generator.ps1`
then builds `emitter.jar` from the patched `./generator`. Because the patch is only ever applied to
the copy, the `core/` submodule working tree stays clean. When the `core/` submodule is bumped,
refresh `core.patch` if its context no longer applies.

## Build

```bash
# From the repo root, install workspace dependencies.
pnpm install

# From the repo root, build the dependencies first. The ^... filter builds
# @azure-tools/typespec-java dependencies without building typespec-java itself.
pnpm turbo run --filter "@azure-tools/typespec-java^..." build

# Then build and pack @azure-tools/typespec-java. This builds the generator
# (emitter.jar via Maven + core.patch, requires JDK 11+ and Maven), builds the
# emitter TypeScript, and packs the .tgz consumed by emitter-tests.
cd packages/typespec-java
pwsh ./Build-TypeSpec.ps1
```

### Pinning the core commit (`core-commit.json`)

`Copy-Sources.ps1` reads the emitter/generator sources from the `core/` submodule's current checkout.
The optional `core-commit.json` pins a specific upstream `core` commit to read from instead:

```json
{ "sha": "3cb616e4e8c3d5b6954bac9832b97445450a71af" }
```

The pinned SHA is fetched if needed and used only when it is **newer** than the current checkout (the
submodule never moves backwards). When the pin is newer, those sources are extracted from that commit
into a temporary directory via `git archive` — the `core/` submodule is **never** checked out or
otherwise modified. This keeps `pnpm build` safe to run alongside the parallel monorepo build (which
reads `core/` concurrently) and keeps CI git-status checks clean. To advance the pin, update the
`sha`.

### Troubleshooting

If `pnpm turbo ...` fails with `'turbo' is not recognized as an internal or external command`
after `pnpm install`, the local install tree is missing Turbo's binary shim. From the repo root,
force pnpm to refresh the local install state and rerun the command:

```powershell
pnpm install --force
pnpm turbo run --filter "@azure-tools/typespec-java^..." build
```

Changing the npm registry has been observed to clear this symptom, possibly because
pnpm re-resolves packages or relinks local binaries after the registry setting changes.

## Before making a Pull request

Make sure to run the following commands:

- `pnpm format`

## Release Process

This describes how to ship a patch (hotfix) release of `@azure-tools/typespec-java` from a
`release/*` branch.

### 1. Create the release branch and bump the version

The overall publishing background for this repo is documented in the root
[`CONTRIBUTING.md` "Publishing" section](../../CONTRIBUTING.md#publishing) (the monthly
TypeSpec-Azure release flow). For preparing the branch and bumping this package's version
specifically, follow the [`hotfix-release` skill](../../.github/skills/hotfix-release/SKILL.md),
which walks through creating the `publish/hotfix/<name>-<sprint>` branch off the
`release/<sprint>` branch and running `pnpm chronus version --ignore-policies`.

### 2. Pin the core commit for the patch (`core-commit.json`)

Release branches do not carry `core/` submodule updates, so bump the pin instead of the
submodule. Update the `sha` field in [`core-commit.json`](./core-commit.json) to the target
upstream `core` commit you want this patch to build and generate from. `Build-Generator.ps1` /
`Copy-Sources.ps1` (build) and `SyncTests.ps1` transiently check out that pinned commit — when it
is newer than the branch's submodule checkout — and always restore the submodule afterwards, so
the patch picks up the core changes without moving the submodule pointer.

### 3. Sync tests from core

Run the test sync from `packages/typespec-java/emitter-tests`:

```powershell
pwsh ./SyncTests.ps1
```

This copies the hand-written tests (`src`) and TypeSpec specs (`tsp`) from
`http-client-generator-test` in the pinned `core/` commit, syncs shared dependency/override
versions, and updates `emitter-tests/package.json` — both its own `version` and the
`file:../azure-tools-typespec-java-<version>.tgz` dependency — to align with the new emitter
version from `package.json`. Commit any resulting changes.

### 4. Open the PR against the release branch

Open a PR targeting `release/<sprint>` (not `main`).

### 5. (Optional) Validate SDK regeneration from the PR emitter (before merging)

Optionally, before merging, use the
[`typespec-java - sync sdk`](https://dev.azure.com/azure-sdk/internal/_build?definitionId=8274&_a=summary)
pipeline to regenerate the Azure SDKs from the emitter built out of this PR:

- Leave **Emitter Version** as `none` (builds the emitter from source).
- Set **PR Id or Branch** to this PR's ID.

This produces an SDK PR generated from the PR's emitter so you can validate the regeneration
before the emitter is released.

### 6. Merge and auto-publish

After the PR is merged, the emitter is automatically released by the
[`typespec-azure - Publish`](https://dev.azure.com/azure-sdk/internal/_build?definitionId=1793)
pipeline.

### 7. Backmerge to main

Merging into the release branch creates a backmerge branch
(`backmerge/release/<sprint>-<date>`). Open a PR from that branch targeting `main` and merge it so
the version bump and changelog are reflected in `main`.

### 8. (Optional) Regenerate and merge the SDK PR with the released version

Optionally, run the
[`typespec-java - sync sdk`](https://dev.azure.com/azure-sdk/internal/_build?definitionId=8274&_a=summary)
pipeline again, this time with **Emitter Version** set to the released `@azure-tools/typespec-java`
version (leaving PR Id or Branch as `none`). Review and merge the resulting SDK PR.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
