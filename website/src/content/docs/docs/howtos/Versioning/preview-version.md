---
title: How to define a preview version
---

See [`@typespec/versioning` documentation](https://typespec.io/docs/libraries/versioning/guide) for the general versioning concept. This guide expands on how Azure Services should define Preview versions.

## Preview Versioning Rules

- Always make the last enum the preview and apply `@previewVersion` to it.
- Apply `@added(Versions.PreviewVersion)` to all preview items - these items will not show up in any GA Version
- For a new GA, add a new version enum **BEFORE** the preview enum value. Manually change all **preview** items that are GA'ing so that the `@added` version value matches the new GA enum value
- For any items remaining in **preview**, rename the **old preview** enum value to the **new preview** enum value.

## Usage Examples

### New preview Version

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

### Adding a new stable (GA) version

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
