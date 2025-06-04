---
title: Resolving Pipeline failures
---

This document explains how to mitigate pipeline failures in TypeSpec migration PRs.

## Swagger BreakingChange

This pipeline will definitely fail if you have more than one swagger files in your latest version. See detailed explanation in the description of this [issue](https://github.com/Azure/typespec-azure/issues/2194#issue-2844564216). Therefore, we leverage "TypeSpec Migration Validation" pipeline to give us a signal if there is breaking change. Go to this pipeline and check the output from "Run TypeSpec Migration Validation". The output is expected to be exactly the same as this [step](../01-get-started.md#review-and-adjust-the-typespec) in your local machine. Review the changes to see if it's expected.

However, if you have only one swagger file in your latest version, you should check out the results of this pipeline. Refer to [Resolving Swagger Breaking Change Violations](./faq/breakingchange.md) if it fails.

## Swagger ModelValidation

Some validation rules may fail because TypeSpec fixes certain legacy patterns. Review the known issues below and take appropriate action.

### INVALID_FORMAT: Object didn't pass validation for format uri: {nextlink}

#### Root cause

The response model of a pageable operation uses the Azure.Core.Page template:

```typespec
model ResponseModel is Azure.Core.Page<ItemType>;
```

This standardized approach makes the nextLink type `uri` instead of plain `string`. If your previous example's `nextLink` value isn't a valid URI, it will cause a CI error.

#### Mitigation

Either:

1. Update your example to include a valid URI value, or
2. Modify your TypeSpec response model definition to:

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

#### Root cause

It is possibly because your own defined resource is mapped to the resource defined in common-type. See [this](./breakingchange.md#using-resources-from-common-types) for details. The `id` type for `Resource` in common-types is of format `arm-id`.

#### Mitigation

Update the value in your example file to meet the format of `arm-id`. 
