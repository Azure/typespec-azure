---
title: 1. Writing Your First Service
---

The Azure Data Plane Service template will create a very basic TypeSpec file in `main.tsp`:

```typespec
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";
import "@azure-tools/typespec-azure-core";
```

These lines import the libraries you will need to build your first service.

> **NOTE:** The `@azure-tools/typespec-autorest` import is not explicitly needed for this tutorial.

**Add the following lines** to bring the models, operations, and decorators you will need into the specification:

```typespec
using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.Core;
```
