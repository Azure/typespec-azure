---
title: How to define a preview version
llmstxt: true
---

See [`@typespec/versioning` documentation](https://typespec.io/docs/libraries/versioning/guide) for the general versioning concept. This guide expands on how Azure Services should define Preview versions.

See [Common ARM Versioning Scenarios](../ARM/versioning.md) for how to make specific kinds of common API changes in ARM specs.

## Preview Versioning Rules for All Azure APIs

- Always make the last enum value the preview and apply `@previewVersion` to it.
- Only one version may be marked with the `@previewVersion` decorator.
- Mark all changes from the latest stable with appropriate versioning decorators, using `Versions.<PreviewVersion>` as the version argument (where `<PreviewVersion>` is the name of the last enum value)

## Preview Versioning Rules for ARM APIs

ARM APIs sometimes have special requirements for retaining swagger for preview APIs that are not yet retired. For detailed information about ARM API Versioning see [Supporting a Single Active Preview in ARM APIs](./ARM/01-about-versioning.md).

## Preview Versioning Rules for Data Plane APIs

- For a new GA, add a new version enum **BEFORE** the preview enum value. Manually change all **preview** items that are GA'ing so that the `@added` version value matches the new GA enum value
- For any items remaining in **preview**, rename the **old preview** enum value to the **new preview** enum value.

### Usage Examples

#### New preview Version

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
