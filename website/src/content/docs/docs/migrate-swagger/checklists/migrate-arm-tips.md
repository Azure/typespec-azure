---
title: Migrate ARM spec
---

The OpenAPI converter will not be able to accurately represent every part of every API in TypeSpec. This document outlines some common changes you may need to make to a converted TypeSpec to make it conform to your existing service API and pass validation checks.

## Initial pass through checklist

✅ **DO** name your ARM spec folder with `.Management` suffix.

✅ **DO** configure your tspconfig.yaml. See: [example tspconfig.yaml][tspconfig]

✅ **DO** extend the `@azure-tools/typespec-azure-rulesets/resource-manager` linter rule set in your tspconfig.yaml if not already there. Example:

```yaml title=tspconfig.yaml
linter:
  extends:
    - "@azure-tools/typespec-azure-rulesets/resource-manager"
```

✅ **DO** ensure your `@service` and `@server` definitions are correct in main.tsp

✅ **DO** ensure `interface Operations extends Azure.ResourceManager.Operations {}` is in main.tsp

✅ **DO** ensure your versions enum is up to date. For an initial migration we recommend migrating your latest stable API version (and the latest preview API version the service may support after the stable API version)

✅ **DO** ensure you have correct ARM common type version select with each service version. Example:

```tsp
  ...
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)  <---
  v2021_10_01_preview: "2021-10-01-preview",
```

✅ **DO** review all enum definitions and add documentation over each value. See: [Documentation in TypeSpec][docs]

❌ **DON'T** suppress documentation warnings

✅ **DO** use the [standard Typespec Azure.ResourceManager and Azure.Core operation templates and data-types][standard-templates] wherever possible. Standard operation templates should be used as much as possible

✅ **DO** use the `CustomAzureResource` template for ARM resources that do not follow the standard `TrackedResource` or `ProxyResource` patterns. Do not use the `@customAzureResource` decorator directly or force non-standard resources into standard ARM shapes.

```tsp
model VmSizeResource is CustomAzureResource {
  /** The unique key for this VM size within its scope */
  @key
  vmSizeName: string;

  /** Normal payload properties */
  properties?: VmSizeResourceProperties;
}
```

✅ **DO** use `union` instead of `enum` to define Azure extensible enums. See: [Defining enums for Azure services][no-enum]. Example:

```tsp
/** The color of a widget. */
union WidgetColor {
  string,

  /** Red Widget Color */
  Red: "Red",

  /** Green Widget Color */
  Green: "Green",

  /** Blue Widget Color */
  Blue: "Blue",
}
```

❌ **DON'T** import or use templates `xxx.Private` namespaces

❌ **DON'T** import or use `@azure-tools/typespec-client-generator-core` in files other than `client.tsp` or `back-compat.tsp`

❌ **DON'T** reference `client.tsp` in `main.tsp`

✅ **DO** reference `back-compat.tsp` in `main.tsp`

✅ **DO** add customizations for ARM APIs in `back-compat.tsp`

✅ **DO** add customizations that impact only generated client SDKs in `client.tsp`

✅ **DO** add customizations that impact both generated client SDKs and generated OpenAPI specs in `back-compat.tsp`

✅ **DO** run `tsp compile .` on your specification and address all warnings

## Additional considerations

✅ **DO** ensure you pull in the latest `main` from the Azure/azure-rest-api-specs repo to stay up to date with latest dependencies

✅ **DO** run `npm ci` to get a clean install of the package.json dependencies

❌ **DON'T** modify the package.json or package-lock.json files at the root of the azure-rest-api-specs repo

❌ **DON'T** add your own package.json or package-lock.json files in your project directory

❌ **DON'T** add multiple tspconfig.yaml files for your service specification

✅ **DO** consult [ci-fix.md][ci-fix] for fixes to common CI errors reported

<!-- LINKS -->

[tspconfig]: https://github.com/Azure/azure-rest-api-specs/blob/main/specification/contosowidgetmanager/Contoso.Management/tspconfig.yaml
[docs]: https://typespec.io/docs/language-basics/documentation
[standard-templates]: https://azure.github.io/typespec-azure/docs/next/libraries/azure-resource-manager/reference
[ci-fix]: https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/ci-fix.md
[no-enum]: https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-enum
