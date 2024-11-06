---
title: Migrate data-plane specs
---

The swagger converter will not be able to accurately represent every part of every API in TypeSpec. This document outlines some common changes you may need to make to a converted TypeSpec to make it conform to your existing service API and pass validation checks.

## Initial pass through checklist

✅ **DO** configure your tspconfig.yaml. See: [example tspconfig.yaml][tspconfig]

✅ **DO** extend the `@azure-tools/typespec-azure-rulesets/data-plane` linter rule set in your tspconfig.yaml. Example:

```
linter:
  extends:
    - "@azure-tools/typespec-azure-rulesets/data-plane"
```

✅ **DO** ensure your `@service` and `@server` definitions are correct in main.tsp

✅ **DO** use the built-in [url][url-type] for endpoint specification. Example:

```
@server(
  "{endpoint}/widget",
  "Contoso Widget APIs",
  {
    /**
      * Supported Widget Services endpoints (protocol and hostname, for example:
      * https://westus.api.widget.contoso.com).
      */
    endpoint: url,
  }
)
```

✅ **DO** ensure that you have a security definition (`@useAuth`) specified for your service. See: [Security definitions in TypeSpec][security-definitions]

✅ **DO** ensure you have versioning (`@versioned`) enabled over your service definition. See: [Versioning][versioning]

✅ **DO** ensure your versions enum is up to date. For an initial migration we recommend migrating your latest stable API version (and the latest preview API version the service may support after the stable API version)

✅ **DO** review all enum definitions and add documentation over each value. See: [Documentation in TypeSpec][docs]

❌ **DON'T** suppress documentation warnings

✅ **DO** use the [standard Typespec Azure operation templates and data-types][standard-templates] wherever possible. Standard operation templates should be used as much as possible

✅ **DO** review model definitions and add the `@resource` decorator over models that represent resources in your service and the `@key` decorator for the resource identifier property on the model. Example:

```
/** A widget. */
@resource("widgets")
model Widget {
  /** The widget name. */
  @key("widgetName")
  @visibility("read")
  name: string;

  /** The widget color. */
  color: WidgetColor;

  /** The ID of the widget's manufacturer. */
  manufacturerId: string;
}
```

✅ **DO** use `union` instead of `enum` to define Azure enums. See: [Defining enums for Azure services][no-enum]. Example:

```
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

❌ **DON'T** import or use templates from the `@azure-tools/typespec-azure-resource-manager` library in a data-plane specification

✅ **DO** make client customizations in a `client.tsp` file

❌ **DON'T** import or use `@azure-tools/typespec-client-generator-core` in other files aside from client.tsp.

✅ **DO** run `tsp compile .` on your specification and address all warnings

## Additional considerations

✅ **DO** ensure you pull in the latest `main` from the Azure/azure-rest-api-specs repo to stay up to date with latest dependencies

✅ **DO** run `npm ci` to get a clean install of the package.json dependencies

❌ **DON'T** modify the package.json or package-lock.json files at the root of the azure-rest-api-specs repo

❌ **DON'T** add your own package.json or package-lock.json files in your project directory

❌ **DON'T** add multiple tspconfig.yaml files for your service specification

✅ **DO** consult [ci-fix.md][ci-fix] for fixes to common CI errors reported

<!-- LINKS -->

[tspconfig]: https://github.com/Azure/azure-rest-api-specs/blob/main/specification/contosowidgetmanager/Contoso.WidgetManager/tspconfig.yaml
[security-definitions]: https://azure.github.io/typespec-azure/docs/reference/azure-style-guide#security-definitions
[versioning]: https://typespec.io/docs/libraries/versioning/guide#implementing-versioned-apis
[docs]: https://typespec.io/docs/language-basics/documentation
[standard-templates]: https://azure.github.io/typespec-azure/docs/libraries/azure-core/reference
[ci-fix]: https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/ci-fix.md
[url-type]: https://typespec.io/docs/language-basics/built-in-types#string-types
[no-enum]: https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-enum
