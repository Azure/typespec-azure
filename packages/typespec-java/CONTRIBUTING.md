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
built from `core/packages/http-client-java/generator` by `Build-Generator.ps1` and staged into
`generator/http-client-generator/target/`.

### Azure customization patch

Before building the jar, `Build-Generator.ps1` applies `core.patch` to the `core/` submodule.
This swaps the unbranded customization engine in `http-client-generator-core` for Azure's
`com.azure.tools:azure-autorest-customization` (resolved from Maven Central), so the
`customization-class` emitter option runs against the Azure customization base. The patch is applied
transiently at build time (the script runs `git checkout .` in `core/` to apply and again to revert
it), so commit/stage any local `core/` changes before building. When the `core/` submodule is bumped,
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

# Just the TypeScript half (no jar; fast):
pnpm build:emitter
```

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
