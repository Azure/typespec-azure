---
title: Introduction
llmstxt: true
---

See [`@typespec/versioning` documentation](https://typespec.io/docs/libraries/versioning/guide) for the general versioning concept. This guide expands on how Azure Services should define and manage API versions.

See [Evolving APIs using the Versioning Library](./06-evolving-apis.md) for how to make specific kinds of common API changes in your specs.

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

This document describes how to convert an existing multi-API TypeSpec spec with multiple previews into a spec with a single active preview. Note that this is not required, but it may significantly simplify the versioning decoration in your spec:

- [How to convert a spec with multiple preview versions into a spec with a single active preview](./uncommon-scenarios/01-converting-specs.md)

### Uncommon Scenarios

Additionally, there are some (ARM) services that may always have features that remain in preview after a stable version is released. This can happen, for example, if there are multiple independent teams that own different resources in a service and operate on their own schedule. The recommended way to handle this scenario is to model your ARM ResourceProvider as multiple services, so each sub-service and the corresponding SDKs can version independently. For some older services, this is not an option, so there is specialized guidance on how to maintain preview features over stable API releases (described below). If you are thinking about splitting your service, or about creating a new preview version with every stable version, be sure to have a discussion with the [Azure API Stewardship Board](https://aka.ms/azapi/officehours) and the [Azure SDK team](https://eng.ms/docs/products/azure-developer-experience/onboard) first.

- [How to manage a single active preview if your service always has some features in preview (ARM only)](./uncommon-scenarios/02-perpetual-preview.md)

## Should I Retain the OpenAPI for an Old Preview API (ARM Only)

:::note
This section applies specifically to **Azure Resource Manager (ARM) APIs**. ARM teams may need to maintain OpenAPI files for preview versions until they are retired for reasons including:

- RPaaS live validation support
- ARM registration support
:::

It is safe to remove the swagger for an old API version if any of the following is true:

- The api-version is retired
- The OpenAPI document in the azure-rest-api-specs repo is not needed for RPaaS live validation
- The OpenAPI document in the azure-rest-api-specs repo is not needed for ARM registration

It is recommended that preview api-versions are set for retirement within 90 days when a preview or stable API is introduced. See the [Azure Retirement Policy](https://aka.ms/AzureRetirementPolicy) and [Azure Retirement Process](https://aka.ms/cpexretirementsprocess) for details.
