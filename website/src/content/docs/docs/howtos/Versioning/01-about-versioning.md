---
title: Introduction
llmstxt: true
---

## How Versioning Works in TypeSpec

TypeSpec uses a versioning library that models the changes in each new version of the API, rather than having a separate API description for each api-version. This works well when APIs evolve according to versioning guidelines, without breaking changes. For the most part, this means that this system is very good at modeling differences between stable api-versions for Azure APIs, but can be cumbersome when describing differences between preview APIs.

Additionally, in Azure, preview APIs have a limited lifespan and limited support in SDKs and other tooling. For this reason and others, specs should only have a _single active preview_ in TypeSpec at any point during the spec development process.

## Preview Versioning Rules for All Azure APIs

- Always make the last enum value the preview and apply `@previewVersion` to it.
- Only one version may be marked with the `@previewVersion` decorator.
- Mark all changes from the latest stable with appropriate versioning decorators, using `Versions.<PreviewVersion>` as the version argument (where `<PreviewVersion>` is the name of the last enum value)

## Common Version Transition Scenarios

These documents add specific guidance about how to follow these guidelines for specific version changes

- [How to add a new preview version when the last version was preview](./02-preview-after-preview.md)
- [How to add a new stable version when the last version was preview](./03-stable-after-preview.md)
- [How to add a new preview version when the last version was stable](./04-preview-after-stable.md)
- [How to add a new stable version when the last version was stable](./05-stable-after-stable.md)

The following document describes how to convert an existing multi-API TypeSpec spec with multiple previews into a spec with a single active preview. Note that this is not required, but it may significantly simplify the versioning decoration in your spec:

- [How to convert a spec with multiple preview versions into a spec with a single active preview](./uncommon-scenarios/01-converting-specs.md)

## Uncommon Scenarios

Additionally, there are some (ARM) services that may always have features that remain in preview after a stable version is released. This can happen, for example, if there are multiple independent teams that own different resources in a service and operate on their own schedule. The recommended way to handle this scenario is to model your ARM ResourceProvider as multiple services, so each sub-service and the corresponding SDKs can version independently. For some older services, this is not an option, so there is specialized guidance on how to maintain preview features over stable API releases (described below). If you are thinking about splitting your service, or about creating a new preview version with every stable version, be sure to have a discussion with the [Azure API Stewardship Board](https://aka.ms/azapi/officehours) and the [Azure SDK team](https://eng.ms/docs/products/azure-developer-experience/onboard) first.

- [How to manage a single active preview if your service always has some features in preview (ARM only)](./uncommon-scenarios/02-perpetual-preview.md)

## Removing OpenAPI for Old Preview API Versions

When adding a new preview or stable version, **always retain the existing OpenAPI files for any old preview versions** in your version-change PR. This simplifies the PR and avoids potential issues with validation and downstream tooling.

If you want to remove old preview OpenAPI files after your version-change PR has merged, create a **separate follow-up PR** that:

- Removes the old preview OpenAPI directory and examples
- Removes references to the old version from `README.md`

:::note
For **ARM APIs**, you may need to retain old preview OpenAPI files even after the initial PR merges, for reasons including:

- RPaaS live validation support
- ARM registration support

It is recommended that preview api-versions are set for retirement within 90 days when a preview or stable API is introduced. See the [Azure Retirement Policy](https://aka.ms/AzureRetirementPolicy) and [Azure Retirement Process](https://aka.ms/cpexretirementsprocess) for details.
:::

## Additional Information on TypeSpec Versioning

- [`@typespec/versioning` documentation](https://typespec.io/docs/libraries/versioning/guide) for the general versioning concept.
- [Evolving APIs using the Versioning Library](./06-evolving-apis.md) for how to make specific kinds of common API changes in your specs.
