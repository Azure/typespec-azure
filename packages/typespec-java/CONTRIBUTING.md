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

TODO: The post-release process for `@azure-tools/typespec-java` has not been finalized yet.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
