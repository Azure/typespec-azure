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

## Local development

A repository-wide `pnpm install` does not require Python. Python is only required when developing or testing this package.
The development scripts require Node.js 22.18 or newer so they can execute TypeScript files directly.
Install the versions pinned in the repository's `mise.toml` with `mise install python uv`, or provide Python 3.9 or newer
with either `uv` or `pip`. Then create the development virtual environment from the repository root:

```bash
pnpm --dir packages/typespec-python run setup:python
```

## Before making a Pull request

Make sure to run the following commands:

- `pnpm format`

## Release Process

The branded Python emitter (`@azure-tools/typespec-python`) wraps the unbranded emitter (`@typespec/http-client-python`). There is no separate release of the branded emitter, unless there is a breaking change or the highest version value changes (ie. 0.3.0 -> 0.4.0 or 1.0.0 to 2.0.0); instead, the release process involves updating the dependency on the unbranded emitter.

For the unbranded emitter release process, see the [http-client-python CONTRIBUTING.md](https://github.com/microsoft/typespec/blob/main/packages/http-client-python/CONTRIBUTING.md#release-process).

Once a new version of the unbranded emitter has been released, follow section [Updating Emitter Option Documentation](https://github.com/microsoft/typespec/blob/main/packages/http-client-python/CONTRIBUTING.md#post-release-updating-azure-sdk-for-python) to update azure-sdk-for-python repo.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
