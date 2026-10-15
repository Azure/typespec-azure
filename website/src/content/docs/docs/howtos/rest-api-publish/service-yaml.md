---
title: Declaring API versions with service.yaml
description: Why the service.yaml manifest exists, what it contains, and how the autorest emitter keeps it up to date.
---

`service.yaml` declares the ordered list of API versions for a service. It sits at the root of your
TypeSpec project, next to `tspconfig.yaml`.

## Why it exists

Which api-versions a service shipped, and in what order, is information many tools need but no file
owned. It was spread across AutoRest `readme.md` tags, folder names, and conventions — all
hand-maintained and easy to drift from the spec.

`service.yaml` gives that metadata one schema-validated home, generated from the spec itself. It is
taking over the version-metadata role of `readme.md`, which is still used for AutoRest configuration
in the meantime.

## The file

```yaml title="service.yaml"
versions:
  # Predates the TypeSpec migration, maintained by hand.
  - version: 2021-05-01
    source: swagger
    swagger-files:
      - resource-manager/Contoso/stable/2021-05-01/contoso.json
  - version: 2023-11-01
    source: typespec
    swagger-files:
      - resource-manager/Contoso/stable/2023-11-01/openapi.json
```

`versions` is ordered oldest to newest. `source` distinguishes TypeSpec-generated versions from
legacy swagger ones, and `swagger-files` paths are relative to `service.yaml`.

## Keeping it up to date

`@azure-tools/typespec-autorest` generates the `source: typespec` entries from your `@versioned`
enum. By default it only does so when the file already exists, so opt in by creating a
`service.yaml` containing `versions: []` and recompiling, or set the option explicitly:

```yaml title="tspconfig.yaml"
options:
  "@azure-tools/typespec-autorest":
    service-yaml: always # auto (default) | always | never
```

Regeneration updates the file in place: comments and unrelated keys are preserved, and
hand-authored `source: swagger` entries are left untouched — only `source: typespec` entries are
managed by the emitter.

:::caution
A project defining multiple services can't be described by a single manifest. The emitter warns and
includes only the first service.
:::
