---
title: About Versioning in the azure-rest-api-specs Repository
---

TypeSpec uses a versioning library that models the changes in each new version of the API, rather than having a separate api description for each api-version.  
This works well when APIs evolve according to versioning guidelines, without breaking changes. For the most part, this means that this system is very good at
modeling differences between stable api-versions for Azure APIs, but can be cumbersome when describing differences between preview APIs.

Additionally, in Azure. preview APIs have a limited lifespan and limited support in SDKs and other tooling. For this reason and others, specs should only have a _single active preview_ at any point during the spec development process.

At the same time, Azure ResourceManager teams may need to maintain OpenAPI files for preview versions until they are retired, some reasons for this include:

- RPaaS live validation support
- ARM registration support

This document describes how to evolve APIs according to these guidelines, and how to meet both the single active preview guideline and the need to maintain some preview versions in Swagger in some situations, focusing on authoring of new APIs:

- [How to add a new preview version when the last version was preview](./02-preview-after-preview.md)
- [How to add a new stable version when the last version was preview](./03-stable-after-preview.md)
- [How to add a new preview version when the last version was stable](./04-preview-after-stable.md)
- [How to add a new stable version when the last version was stable](./05-stable-after-stable.md)

This document also describes how to move an existing multi-api typespec spec with multiple previews:

- [How to convert a spec with multiple preview versions into a spec with a single active preview](./06-converting-specs.md)

Additionally, there are some services that may always have features that remain in preview after a stable version is released. This can happen, for example, if there are multiple independent teams that own different resources in a service and operate on their own schedule. The recommended way to handle
this scenario is to model your ResourceProvider as multiple services, so each version and the corresponding SDKs can version independently. For some older services, this is not an option, so there is specialized guidance on how to maintain preview features over stable api releases:

- [How to manage a single active preview if your service always has some features in preview](./07-perpetual-preview.md)
