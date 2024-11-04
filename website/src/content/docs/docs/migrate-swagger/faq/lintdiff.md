---
title: Resolving Swagger Lint Diff Violations
---

The Swagger Converter will not be able to accurately represent every part of every API in TypeSpec. This document
outlines some common changes you might need to make to a converted TypeSpec to make it conform to your existing service API and  
pass check-in validations.

## Migrate ARM Specs

## Resolving Swagger LintDiff Violations

### `VisibilityChanged` for `nextLink` and `value` properties

The issue is that some older specifications marked these values as read only. This has no real impact on the API or client generation, but it is easy to mitigate for the whole specification. To fix, simply add the following augment decorator statements to the `main.tsp` file.

```tsp
@@visibility(Azure.Core.Page.value, "read");
@@visibility(Azure.Core.Page.nextLink, "read");
```

### `ProvisioningStateMustBeReadOnly`

This violation is caused by a problem with the mechanism that ARM Api validation uses to determine if a [property is read-only. You can work around the issue by setting the `use-read-only-status-schema` configuration setting in `azure/tools/typespec-autorest` options to `true` in your `tspConfig.yaml` configuration file:

```yml
emit:
  - "@azure-tools/typespec-autorest"
options:
  "@azure-tools/typespec-autorest":
    use-read-only-status-schema: true
```

### `LroLocationHeader`

This violation occurs when your spec uses an LRO operation template that follows the older version of LRO standards. Tof fix the issue, you would change the operation template to match the latest recommendation.

#### PUT Operations

```tsp
  // LRO PUT template with required headers and no 200 response
  createOrUpdate is ArmResourceCreateOrReplaceAsync<MyResource>;
```

#### PATCH Operations

```tsp
  // LRO PATCH template with required headers, response codes, and lro options
  update is ArmResourcePatchAsync<MyResource, MyResourceProperties>;
```

### POST(Action) Operations

```tsp
  // LRO POST (Action) template with required headers, response codes, and lro options
  doAction is ArmResourceActionAsync<MyResource, RequestModel, ResponseModel>;
```

### DELETE Operations

```tsp
  // LRO delete template with required headers and no 200 response
  delete is ArmResourceDeleteWithoutOKAsync<MyResource>;
```
