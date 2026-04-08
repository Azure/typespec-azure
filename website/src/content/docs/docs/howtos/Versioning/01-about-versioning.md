---
title: Introduction
llmstxt: true
---

See [`@typespec/versioning` documentation](https://typespec.io/docs/libraries/versioning/guide) for the general versioning concept. This guide expands on how Azure Services should define and manage API versions.

See [Common Versioning Scenarios](../ARM/versioning.md) for how to make specific kinds of common API changes in your specs.

## How Versioning Works in TypeSpec

TypeSpec uses a versioning library that models the changes in each new version of the API, rather than having a separate API description for each api-version. This works well when APIs evolve according to versioning guidelines, without breaking changes. For the most part, this means that this system is very good at modeling differences between stable api-versions for Azure APIs, but can be cumbersome when describing differences between preview APIs.

Additionally, in Azure, preview APIs have a limited lifespan and limited support in SDKs and other tooling. For this reason and others, specs should only have a _single active preview_ in TypeSpec at any point during the spec development process.

## Preview Versioning Rules for All Azure APIs

- Always make the last enum value the preview and apply `@previewVersion` to it.
- Only one version may be marked with the `@previewVersion` decorator.
- Mark all changes from the latest stable with appropriate versioning decorators, using `Versions.<PreviewVersion>` as the version argument (where `<PreviewVersion>` is the name of the last enum value)

## Preview Versioning Rules for Data Plane APIs

- For a new GA, add a new version enum **BEFORE** the preview enum value. Manually change all **preview** items that are GA'ing so that the `@added` version value matches the new GA enum value
- For any items remaining in **preview**, rename the **old preview** enum value to the **new preview** enum value.

## Common Version Transition Scenarios

This section describes how to evolve APIs according to these guidelines, and how to meet both the single active preview guideline and the need to maintain some preview versions in certain situations:

- [How to add a new preview version when the last version was preview](./02-preview-after-preview.md)
- [How to add a new stable version when the last version was preview](./03-stable-after-preview.md)
- [How to add a new preview version when the last version was stable](./04-preview-after-stable.md)
- [How to add a new stable version when the last version was stable](./05-stable-after-stable.md)

This section also describes how to convert an existing multi-API TypeSpec spec with multiple previews into a spec with a single active preview. Note that this is not required, but it may significantly simplify the versioning decoration in your spec:

- [How to convert a spec with multiple preview versions into a spec with a single active preview](./uncommon-scenarios/01-converting-specs.md)

Additionally, there are some services that may always have features that remain in preview after a stable version is released. This can happen, for example, if there are multiple independent teams that own different resources in a service and operate on their own schedule. The recommended way to handle this scenario is to model your ResourceProvider as multiple services, so each version and the corresponding SDKs can version independently. For some older services, this is not an option, so there is specialized guidance on how to maintain preview features over stable API releases (described below). If you are thinking about splitting your service, or about creating a new preview version with every stable version, be sure to have a discussion with the [Azure API Stewardship Board](https://aka.ms/azapi/officehours) and the [Azure SDK team](https://eng.ms/docs/products/azure-developer-experience/onboard) first.

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

### Usage Examples

#### New preview version

In the following example we introduce a new preview version called `v3Preview` which includes everything from `v2` plus adds a new property to the `Widget` resource.

```diff lang=tsp
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";

using Http;
using Rest;
using Versioning;
using Azure.Core;


@versioned(Versions)
@service(#{ title: "Widget Service" })
namespace DemoService;

enum Versions {
  v1,
  v2,
+  @previewVersion
+  v3Preview
}

/**
 * Model defining the Widget resource
 */
model Widget {
  /**
   * Identifier of the Widget Resource
   */
  @visibility(Lifecycle.Read)
  @key id: string;
  /**
   * Weight of the widget
   */
  weight: int32;
  /**
   * Color of the widget;
   */
  color: "red" | "blue";
  /**
   * Nickname of the Widget resource
   */
+  @added(Versions.v3Preview) nickname: string;
}
```

#### Adding a new stable (GA) version

This example builds on the previous one, where `v3` is introduced which GA's the `nickname` property introduced in `v3Preview`

```diff lang=tsp
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";

using Http;
using Rest;
using Versioning;
using Azure.Core;


@versioned(Versions)
@service(#{ title: "Widget Service" })
namespace DemoService;

enum Versions {
  v1,
  v2,
-  @previewVersion
-  v3Preview
+  v3
}

/**
 * Model defining the Widget resource
 */
model Widget {
  /**
   * Identifier of the Widget Resource
   */
  @visibility(Lifecycle.Read)
  @key id: string;
  /**
   * Weight of the widget
   */
  weight: int32;
  /**
   * Color of the widget;
   */
  color: "red" | "blue";
  /**
   * Nickname of the Widget resource
   */
-  @added(Versions.v3Preview) nickname: string;
+  @added(Versions.v3) nickname: string;
}
```
