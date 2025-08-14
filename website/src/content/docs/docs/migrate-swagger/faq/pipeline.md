---
title: Resolving Pipeline Failures
---

This document explains how to resolve pipeline failures in TypeSpec migration PRs.

## Swagger BreakingChange

### Multiple Swagger Files Before Migration

This pipeline will fail if you have more than one Swagger file in your latest version. See the detailed explanation in this [issue](https://github.com/Azure/typespec-azure/issues/2194#issue-2844564216).

To properly identify real breaking changes, use the "TypeSpec Migration Validation" pipeline instead:

1. Navigate to the TypeSpec Migration Validation pipeline
2. Check the report on the "Summary" page
3. The output should match exactly what you see in [this step](../01-get-started.md#review-and-adjust-the-typespec) on your local machine
4. Review the changes to verify they are expected

### Single Swagger File Before Migration

If you have only one Swagger file in your latest version, use this pipeline to detect breaking changes. If it fails, refer to [Resolving Swagger Breaking Change Violations](./faq/breakingchange.md).

**Known Issues**: The following pipeline failures are false alerts and can be safely ignored:

#### 1017 - ReferenceRedirection

This typically occurs when an inlined anonymous enum becomes a named enum.

**Before:**

```json
"SomeModel": {
  "enumProperty": {
    "type": "string",
    "enum": [
      "If",
      "Else",
      "None"
    ],
    "x-ms-enum": {
      "name": "EnumType",
      "modelAsString": true
    }
  }
}
```

**After:**

```json
"SomeModel": {
  "enumProperty": {
    "$ref": "#/definitions/EnumType"
  }
},
"EnumType": {
  "type": "string",
  "enum": [
    "If",
    "Else",
    "None"
  ],
  "x-ms-enum": {
    "name": "EnumType",
    "modelAsString": true
  }
}
```

#### 1023 - TypeFormatChanged

The error message `The new version has a different format 'uri' than the previous one ''.` on the `nextLink` property is expected because the [page template defines the `nextLink` as `uri`](./mustread.md#using-page-model-from-azurecore-library).

#### 1047 - XmsEnumChanged

After migration, all models (including enums) will have capitalized names.

**Before:**

```json
"SomeModel": {
  "someProperty": {
    "type": "string",
    "enum": [
      "If"
    ],
    "x-ms-enum": {
      "name": "someName",
      "modelAsString": true
    }
  }
}
```

**After:**

```json
"SomeModel": {
  "someProperty": {
    "$ref": "#/definitions/SomeName"
  }
},
"SomeName": {
  "type": "string",
  "enum": [
    "If"
  ],
  "x-ms-enum": {
    "name": "SomeName",
    "modelAsString": true
  }
}
```

## Swagger ModelValidation

Some validation rules may fail because TypeSpec fixes certain legacy patterns. Review the known issues below and take appropriate action.

### INVALID_FORMAT: Object didn't pass validation for format uri: {nextlink}

#### Root Cause

The response model of a pageable operation uses the Azure.Core.Page template:

```typespec
model ResponseModel is Azure.Core.Page<ItemType>;
```

This standardized approach changes the `nextLink` type from plain `string` to `uri`. If your previous example's `nextLink` value isn't a valid URI, it will cause a validation error.

#### Resolution

Choose one of the following options:

1. **Update your example** to include a valid URI value, or
2. **Modify your TypeSpec response model** to use a custom definition:

```typespec
@pagedResult
model ResponseModel {
  @items
  value: ItemType[];

  @nextLink
  nextLink?: string;
}
```

### INVALID_FORMAT: Object didn't pass validation for format arm-id

#### Root Cause

This error typically occurs when a custom resource definition is mapped to a resource defined in common-types. See [this section](./breakingchange.md#using-resources-from-common-types) for details. The `id` property for `Resource` in common-types may use the `arm-id` format, depending on the version of common-types used.

#### Resolution

Update the value in your example file to meet the `arm-id` format requirements.
