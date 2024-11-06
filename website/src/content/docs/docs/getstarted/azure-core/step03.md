---
title: 3. Using the versioned Azure.Core types
---

Before you can use the models and operations defined in the `Azure.Core` namespace, you will need to specify the API version of the `Azure.Core` library that your service uses. You can do this by adding the `@useDependency` decorator to the `Contoso.WidgetManager` namespace as seen here:

```typespec
@service({
  title: "Contoso Widget Manager",
})
@useDependency(Azure.Core.Versions.v1_0_Preview_2)
namespace Contoso.WidgetManager;
```

See the sections [Versioning your service](./step10.md#versioning-your-service) and [Using Azure.Core versions](./step10.md#using-azurecore-versions) for more details about service versioning.

> **NOTE:** The `Azure.Core` version used in this tutorial may be out of date! The `typespec-azure-core` [README.md](https://github.com/Azure/typespec-azure/blob/main/packages/typespec-azure-core/README.md) file contains the versions listing which describes the available versions.
