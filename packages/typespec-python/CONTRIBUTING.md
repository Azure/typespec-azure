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

## Before making a Pull request

Make sure to run the following commands:

- `pnpm format`

## Release Process

The branded Python emitter (`@azure-tools/typespec-python`) wraps the unbranded emitter (`@typespec/http-client-python`). There is no separate release of the branded emitter; instead, the release process involves updating the dependency on the unbranded emitter.

For the unbranded emitter release process, see the [http-client-python CONTRIBUTING.md](https://github.com/microsoft/typespec/blob/main/packages/http-client-python/CONTRIBUTING.md#release-process).

Once a new version of the unbranded emitter has been released, follow these steps to update the branded emitter:

1. **Update the catalog version in `typespec-azure`**: Bump the version of `@typespec/http-client-python` in [`pnpm-workspace.yaml`](https://github.com/Azure/typespec-azure/blob/main/pnpm-workspace.yaml) to the latest released version.

2. **Update `emitter-package.json` in `azure-sdk-for-python`**: Bump the dependency of `@typespec/http-client-python` to the latest released version in [`eng/emitter-package.json`](https://github.com/Azure/azure-sdk-for-python/blob/main/eng/emitter-package.json).

3. **Regenerate `emitter-package-lock.yaml`**: Run the following command to update the lock file, making sure it points to your local `typespec-azure` repo where you updated the catalog version in step 1:

   ```bash
   tsp-client generate-config-files --package-json=<path-to-your-local-typespec-azure-repo>/packages/typespec-python/package.json --use-npm-pinning
   ```

4. **Check in the changes**: The updated `emitter-package.json` and regenerated `emitter-package-lock.yaml` should both be committed and submitted as part of the release PR.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
