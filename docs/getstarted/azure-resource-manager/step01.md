---
title: 2. Defining the Service
---

To define an Azure Resource Manager service, the first thing you will need to do is define the service namespace and decorate it with the `service` and `armProviderNamespace` decorators:

```typespec
@armProviderNamespace
@service({title: "<service name>", version: "<service version>"})
namespace <mynamespace>;
```

For example:

```typespec
@armProviderNamespace
@service({
  title: "Contoso User Service",
  version: "2020-10-01-preview",
})
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
namespace Contoso.Users;
```

If you need to use a different version of the ARM `common-types` definitions in your emitted Swagger files, change the `@armCommonTypesVersion` decorator to the version that you require.

## The `using` keyword

Just after the `namespace` declaration, you will also need to include a few `using` statements to pull in symbols from the namespaces of libraries you will for your specification.

For example, these lines pull in symbols from the `@typespec/rest` and `@azure-tools/typespec-azure-resource-manager`:

```
using TypeSpec.Http;
using TypeSpec.Rest;
using Azure.ResourceManager;
```

## The `operations` interface

All Resource Providers are required to provide operations that list the available operations for their resources. If you are using ProviderHub (RPaaS: RP as a Service), this functionality can be provided for you, but you will still need to include these operations in your api description. You can include these operations in your API description automatically using the following code:

```typespec
interface Operations extends Azure.ResourceManager.Operations {}
```
