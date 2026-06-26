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
at build time by `eng/scripts/Copy-Sources.ps1` (excluding `options.ts`). The Java `emitter.jar` is
built from `core/packages/http-client-java/generator` by `Build-TypeSpec.ps1` and staged into
`generator/http-client-generator/target/`.

### Azure customization patch

Before building the jar, `Build-TypeSpec.ps1` applies `core.patch` to the `core/` submodule.
This swaps the unbranded customization engine in `http-client-generator-core` for Azure's
`com.azure.tools:azure-autorest-customization` (resolved from Maven Central), so the
`customization-class` emitter option runs against the Azure customization base. The patch is applied
transiently at build time (the script runs `git checkout .` in `core/` first), so commit/stage any
local `core/` changes before building. When the `core/` submodule is bumped, refresh `core.patch`
if its context no longer applies.

## Build

```bash
# Copy emitter sources from core and compile TypeScript (no jar; fast, what turbo runs)
pnpm build

# Full build: apply patch, build the Java emitter.jar (requires JDK 17+ and Maven),
# stage it, copy sources, compile and pack.
pnpm build:full
```

## Before making a Pull request

Make sure to run the following commands:

- `pnpm format`

## Release Process

The branded Java emitter (`@azure-tools/typespec-java`) wraps the unbranded emitter
(`@typespec/http-client-java`). The emitter sources and the `emitter.jar` are built from the `core/`
submodule. To pick up a new version of the unbranded emitter, bump the `core/` submodule and rebuild.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
