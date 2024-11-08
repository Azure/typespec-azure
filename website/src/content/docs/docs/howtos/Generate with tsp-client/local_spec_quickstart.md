---
title: Quickstart (local development)
---

`tsp-client` allows you to develop your TypeSpec project locally before pushing changes upstream. These instructions can be used when you want to generate a client library from a local TypeSpec project that has the changes you wish to use.

### Prerequisites

- Install `tsp-client`:

```bash
npm install -g @azure-tools/typespec-client-generator-cli
```

- Have a local Git repository with your TypeSpec project. We'll use the `azure-rest-api-specs` repository in examples.
- Have a clone of an `azure-sdk-for-<language>` repository. We'll use `azure-sdk-for-python` in examples.

### Generate a client library from local changes

1. Go to local `azure-rest-api-specs` clone.
2. Create/Modify the TypeSpec project.
3. Switch to the language repository clone you want to generate a client library in. Example:

```bash
cd <path to>/azure-sdk-for-python
```

4. From the root of the repository run the following command:

```bash
azure-sdk-for-python> tsp-client init -c <path to local typespec project at tspconfig.yaml level>
```

Example:

```bash
azure-sdk-for-python> tsp-client init -c ../azure-rest-api-specs/specification/contosowidgetmanager/Contoso.WidgetManager/
```

:::info
To get familiar with `tsp-client` and supported commands, see [tsp-client usage](https://aka.ms/azsdk/tsp-client).
:::
