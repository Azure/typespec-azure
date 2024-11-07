---
title:  Quickstart - Local development
---

Follow these steps to work on a local TypeSpec project and generate a client library from your changes:

### Prerequisites

- Install `tsp-client`:

```pwsh
npm install -g @azure-tools/typespec-client-generator-cli
```

- Have a clone of the `azure-rest-api-specs` repository.
- Have a clone of an `azure-sdk-for-<language>` repository. We'll use `azure-sdk-for-python` in examples.

### Generate a client library from local changes

1. Go to local `azure-rest-api-specs` clone.
2. Create/Modify the TypeSpec project.
3. Switch to the language repository clone you want to generate a client library in. Example:

```pwsh
cd <path to>/azure-sdk-for-python
```

4. From the root of the repository run the following command:

```pwsh
azure-sdk-for-python> tsp-client init -c <path to local typespec project at tspconfig.yaml level>
```

Example:

```pwsh
azure-sdk-for-python> tsp-client init -c ../azure-rest-api-specs/specification/contosowidgetmanager/Contoso.WidgetManager/
```

:::info
To get familiar with `tsp-client` and supported commands, see [Getting started with `tsp-client`](https://aka.ms/azsdk/tsp-client).
:::
