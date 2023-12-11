---
title: "Decorators"
toc_min_heading_level: 2
toc_max_heading_level: 3
---

# Decorators

## Azure.ResourceManager

### `@armCommonTypesVersion` {#@Azure.ResourceManager.armCommonTypesVersion}

This decorator is used either on a namespace or a version enum value to indicate
the version of the ARM common-types to use for refs in emitted Swagger files.

```typespec
@Azure.ResourceManager.armCommonTypesVersion(version: valueof string | EnumMember)
```

#### Target

`union Namespace | EnumMember`

#### Parameters

| Name    | Type                                 | Description                                                                                                        |
| ------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| version | `valueof union string \| EnumMember` | The Azure.ResourceManager.CommonTypes.Versions for the desired common-types version or an equivalent string value. |

### `@armLibraryNamespace` {#@Azure.ResourceManager.armLibraryNamespace}

`@armLibraryNamespace` designates a namespace as containign ARM Provider information.

```typespec
@Azure.ResourceManager.armLibraryNamespace
```

#### Target

`Namespace`

#### Parameters

None

#### Examples

```typespec
@armLibraryNamespace
namespace Microsoft.Contoso;
```

### `@armProviderNamespace` {#@Azure.ResourceManager.armProviderNamespace}

`@armProviderNamespace` sets the ARM provider name. It will default to use the
Namespace element value unless an override value is specified.

```typespec
@Azure.ResourceManager.armProviderNamespace(providerNamespace?: valueof string)
```

#### Target

`Namespace`

#### Parameters

| Name              | Type                    | Description        |
| ----------------- | ----------------------- | ------------------ |
| providerNamespace | `valueof scalar string` | Provider namespace |

#### Examples

```typespec
@armProviderNamespace
namespace Microsoft.Contoso;
```

```typespec
@armProviderNamespace("Microsoft.Contoso")
namespace Microsoft.ContosoService;
```

### `@armProviderNameValue` {#@Azure.ResourceManager.armProviderNameValue}

`@armResourceType` sets the value fo the decorated string
property to the type of the ARM resource.

```typespec
@Azure.ResourceManager.armProviderNameValue
```

#### Target

`union Operation | Model`

#### Parameters

None

### `@armRenameListByOperation` {#@Azure.ResourceManager.armRenameListByOperation}

Marks the operation as being a collection action

```typespec
@Azure.ResourceManager.armRenameListByOperation(resourceType: Model, parentTypeName?: valueof string, parentFriendlyTypeName?: valueof string)
```

#### Target

`Operation`

#### Parameters

| Name                   | Type                    | Description               |
| ---------------------- | ----------------------- | ------------------------- |
| resourceType           | `Model`                 | Resource                  |
| parentTypeName         | `valueof scalar string` | : Parent type name.       |
| parentFriendlyTypeName | `valueof scalar string` | Friendly name for parent. |

### `@armResourceAction` {#@Azure.ResourceManager.armResourceAction}

```typespec
@Azure.ResourceManager.armResourceAction(resourceType: Model)
```

#### Target

`Operation`

#### Parameters

| Name         | Type    | Description    |
| ------------ | ------- | -------------- |
| resourceType | `Model` | Resource model |

### `@armResourceCollectionAction` {#@Azure.ResourceManager.armResourceCollectionAction}

Marks the operation as being a collection action

```typespec
@Azure.ResourceManager.armResourceCollectionAction
```

#### Target

`Operation`

#### Parameters

None

### `@armResourceCreateOrUpdate` {#@Azure.ResourceManager.armResourceCreateOrUpdate}

```typespec
@Azure.ResourceManager.armResourceCreateOrUpdate(resourceType: Model)
```

#### Target

`Operation`

#### Parameters

| Name         | Type    | Description    |
| ------------ | ------- | -------------- |
| resourceType | `Model` | Resource model |

### `@armResourceDelete` {#@Azure.ResourceManager.armResourceDelete}

```typespec
@Azure.ResourceManager.armResourceDelete(resourceType: Model)
```

#### Target

`Operation`

#### Parameters

| Name         | Type    | Description    |
| ------------ | ------- | -------------- |
| resourceType | `Model` | Resource model |

### `@armResourceList` {#@Azure.ResourceManager.armResourceList}

```typespec
@Azure.ResourceManager.armResourceList(resourceType: Model)
```

#### Target

`Operation`

#### Parameters

| Name         | Type    | Description    |
| ------------ | ------- | -------------- |
| resourceType | `Model` | Resource model |

### `@armResourceOperations` {#@Azure.ResourceManager.armResourceOperations}

This decorator is used to identify interfaces containing resource operations.
When applied, it marks the interface with the `@autoRoute` decorator so that
all of its contained operations will have their routes generated
automatically.

It also adds a `@tag` decorator bearing the name of the interface so that all
of the operations will be grouped based on the interface name in generated
clients.

```typespec
@Azure.ResourceManager.armResourceOperations(_?: unknown)
```

#### Target

`Interface`

#### Parameters

| Name | Type                  | Description |
| ---- | --------------------- | ----------- |
| \_   | `(intrinsic) unknown` | DEPRECATED  |

### `@armResourceRead` {#@Azure.ResourceManager.armResourceRead}

```typespec
@Azure.ResourceManager.armResourceRead(resourceType: Model)
```

#### Target

`Operation`

#### Parameters

| Name         | Type    | Description    |
| ------------ | ------- | -------------- |
| resourceType | `Model` | Resource model |

### `@armResourceUpdate` {#@Azure.ResourceManager.armResourceUpdate}

```typespec
@Azure.ResourceManager.armResourceUpdate(resourceType: Model)
```

#### Target

`Operation`

#### Parameters

| Name         | Type    | Description    |
| ------------ | ------- | -------------- |
| resourceType | `Model` | Resource model |

### `@extensionResource` {#@Azure.ResourceManager.extensionResource}

`@extensionResource` marks an ARM resource model as an Extension resource.
Extension resource extends other resource types. URL path is appended
to another segment {scope} which refers to another Resource URL.

`{resourceUri}/providers/Microsoft.Contoso/accessPermissions`

See more details on [different ARM resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)

```typespec
@Azure.ResourceManager.extensionResource
```

#### Target

`Model`

#### Parameters

None

### `@locationResource` {#@Azure.ResourceManager.locationResource}

`@locationResource` marks an ARM resource model as a location based resource.

Location based resources have REST API paths like
`/subscriptions/{subscriptionId}/locations/{location}/providers/Microsoft.Contoso/employees`

See more details on [different ARM resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)

```typespec
@Azure.ResourceManager.locationResource
```

#### Target

`Model`

#### Parameters

None

### `@resourceGroupResource` {#@Azure.ResourceManager.resourceGroupResource}

`@resourceGroupResource` marks an ARM resource model as a resource group level resource.
This is the default option for ARM resources. It is provided for symmetry and clarity, and
you typically do not need to specify it.

`/subscription/{id}/resourcegroups/{rg}/providers/Microsoft.Contoso/employees`

See more details on [different ARM resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)

```typespec
@Azure.ResourceManager.resourceGroupResource
```

#### Target

`Model`

#### Parameters

None

### `@singleton` {#@Azure.ResourceManager.singleton}

`@singleton` marks an ARM resource model as a singleton resource.

Singleton resources only have a single instance with a fixed key name.
`.../providers/Microsoft.Contoso/monthlyReports/default`

See more details on [different ARM resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)

```typespec
@Azure.ResourceManager.singleton(keyValue?: valueof string | default)
```

#### Target

`Model`

#### Parameters

| Name     | Type                              | Description                                                    |
| -------- | --------------------------------- | -------------------------------------------------------------- |
| keyValue | `valueof union string \| default` | The name of the singleton resource. Default name is "default". |

### `@subscriptionResource` {#@Azure.ResourceManager.subscriptionResource}

`@subscriptionResource` marks an ARM resource model as a subscription resource.

Subscription resources have REST API paths like:
`/subscription/{id}/providers/Microsoft.Contoso/employees`

See more details on [different ARM resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)

```typespec
@Azure.ResourceManager.subscriptionResource
```

#### Target

`Model`

#### Parameters

None

### `@tenantResource` {#@Azure.ResourceManager.tenantResource}

`@tenantResource` marks an ARM resource model as a Tenant resource/Root resource/Top-Level resource.

Tenant resources have REST API paths like:
`/provider/Microsoft.Contoso/FooResources`

See more details on [different ARM resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)

```typespec
@Azure.ResourceManager.tenantResource
```

#### Target

`Model`

#### Parameters

None

### `@useLibraryNamespace` {#@Azure.ResourceManager.useLibraryNamespace}

Declare the ARM library namespaces used in this provider.
This allows sharing ARM resource types across specifications

```typespec
@Azure.ResourceManager.useLibraryNamespace(...namespaces: Namespace[])
```

#### Target

`Namespace`

#### Parameters

| Name       | Type                | Description                                           |
| ---------- | ------------------- | ----------------------------------------------------- |
| namespaces | `model Namespace[]` | The namespaces of arm libraries used in this provider |
