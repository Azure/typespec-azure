---
title: "Decorators"
toc_min_heading_level: 2
toc_max_heading_level: 3
---

## Azure.ResourceManager

### `@armCommonTypesVersion` {#@Azure.ResourceManager.armCommonTypesVersion}

This decorator is used either on a namespace or a version enum value to indicate
the version of the Azure Resource Manager common-types to use for refs in emitted Swagger files.

```typespec
@Azure.ResourceManager.armCommonTypesVersion(version: valueof string | EnumMember)
```

#### Target

`Namespace | EnumMember`

#### Parameters

| Name    | Type                           | Description                                                                                                                  |
| ------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| version | `valueof string \| EnumMember` | The Azure.ResourceManager.CommonTypes.Versions for the desired common-types version or an equivalent string value like "v5". |

### `@armLibraryNamespace` {#@Azure.ResourceManager.armLibraryNamespace}

`@armLibraryNamespace` designates a namespace as containign Azure Resource Manager Provider information.

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

`@armProviderNamespace` sets the Azure Resource Manager provider name. It will default to use the
Namespace element value unless an override value is specified.

```typespec
@Azure.ResourceManager.armProviderNamespace(providerNamespace?: valueof string)
```

#### Target

`Namespace`

#### Parameters

| Name              | Type             | Description        |
| ----------------- | ---------------- | ------------------ |
| providerNamespace | `valueof string` | Provider namespace |

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
property to the type of the Azure Resource Manager resource.

```typespec
@Azure.ResourceManager.armProviderNameValue
```

#### Target

`Operation`

#### Parameters

None

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

| Name | Type      | Description |
| ---- | --------- | ----------- |
| \_   | `unknown` | DEPRECATED  |

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

### `@armVirtualResource` {#@Azure.ResourceManager.armVirtualResource}

This decorator is used on Azure Resource Manager resources that are not based on
Azure.ResourceManager common types.

```typespec
@Azure.ResourceManager.armVirtualResource(provider?: valueof string)
```

#### Target

`Model`

#### Parameters

| Name     | Type             | Description |
| -------- | ---------------- | ----------- |
| provider | `valueof string` |             |

### `@extensionResource` {#@Azure.ResourceManager.extensionResource}

`@extensionResource` marks an Azure Resource Manager resource model as an Extension resource.
Extension resource extends other resource types. URL path is appended
to another segment {scope} which refers to another Resource URL.

`{resourceUri}/providers/Microsoft.Contoso/accessPermissions`

See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)

```typespec
@Azure.ResourceManager.extensionResource
```

#### Target

`Model`

#### Parameters

None

### `@identifiers` {#@Azure.ResourceManager.identifiers}

This decorator is used to indicate the identifying properties of objects in the array, e.g. size
The properties that are used as identifiers for the object needs to be provided as a list of strings.

```typespec
@Azure.ResourceManager.identifiers(properties: valueof string[])
```

#### Target

`ModelProperty`

#### Parameters

| Name       | Type               | Description                                                                                                         |
| ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| properties | `valueof string[]` | The list of properties that are used as identifiers for the object. This needs to be provided as a list of strings. |

#### Examples

```typespec
model Pet {
  @identifiers(#["size"])
  dog: Dog;
}
```

### `@locationResource` {#@Azure.ResourceManager.locationResource}

`@locationResource` marks an Azure Resource Manager resource model as a location based resource.

Location based resources have REST API paths like
`/subscriptions/{subscriptionId}/locations/{location}/providers/Microsoft.Contoso/employees`

See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)

```typespec
@Azure.ResourceManager.locationResource
```

#### Target

`Model`

#### Parameters

None

### `@resourceBaseType` {#@Azure.ResourceManager.resourceBaseType}

This decorator sets the base type of the given resource.

```typespec
@Azure.ResourceManager.resourceBaseType(baseType: "Tenant" | "Subscription" | "ResourceGroup" | "Location" | "Extension")
```

#### Target

`Model`

#### Parameters

| Name     | Type                                                                         | Description                                                                                                            |
| -------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| baseType | `"Tenant" \| "Subscription" \| "ResourceGroup" \| "Location" \| "Extension"` | The built-in parent of the resource, this can be "Tenant", "Subscription", "ResourceGroup", "Location", or "Extension" |

### `@resourceGroupResource` {#@Azure.ResourceManager.resourceGroupResource}

`@resourceGroupResource` marks an Azure Resource Manager resource model as a resource group level resource.
This is the default option for Azure Resource Manager resources. It is provided for symmetry and clarity, and
you typically do not need to specify it.

`/subscription/{id}/resourcegroups/{rg}/providers/Microsoft.Contoso/employees`

See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)

```typespec
@Azure.ResourceManager.resourceGroupResource
```

#### Target

`Model`

#### Parameters

None

### `@singleton` {#@Azure.ResourceManager.singleton}

`@singleton` marks an Azure Resource Manager resource model as a singleton resource.

Singleton resources only have a single instance with a fixed key name.
`.../providers/Microsoft.Contoso/monthlyReports/default`

See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)

```typespec
@Azure.ResourceManager.singleton(keyValue?: valueof string | "default")
```

#### Target

`Model`

#### Parameters

| Name     | Type                          | Description                                                    |
| -------- | ----------------------------- | -------------------------------------------------------------- |
| keyValue | `valueof string \| "default"` | The name of the singleton resource. Default name is "default". |

### `@subscriptionResource` {#@Azure.ResourceManager.subscriptionResource}

`@subscriptionResource` marks an Azure Resource Manager resource model as a subscription resource.

Subscription resources have REST API paths like:
`/subscription/{id}/providers/Microsoft.Contoso/employees`

See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)

```typespec
@Azure.ResourceManager.subscriptionResource
```

#### Target

`Model`

#### Parameters

None

### `@tenantResource` {#@Azure.ResourceManager.tenantResource}

`@tenantResource` marks an Azure Resource Manager resource model as a Tenant resource/Root resource/Top-Level resource.

Tenant resources have REST API paths like:
`/provider/Microsoft.Contoso/FooResources`

See more details on [different Azure Resource Manager resource type here.](https://azure.github.io/typespec-azure/docs/howtos/ARM/resource-type)

```typespec
@Azure.ResourceManager.tenantResource
```

#### Target

`Model`

#### Parameters

None

### `@useLibraryNamespace` {#@Azure.ResourceManager.useLibraryNamespace}

Declare the Azure Resource Manager library namespaces used in this provider.
This allows sharing Azure Resource Manager resource types across specifications

```typespec
@Azure.ResourceManager.useLibraryNamespace(...namespaces: Namespace[])
```

#### Target

`Namespace`

#### Parameters

| Name       | Type          | Description                                                              |
| ---------- | ------------- | ------------------------------------------------------------------------ |
| namespaces | `Namespace[]` | The namespaces of Azure Resource Manager libraries used in this provider |

## Azure.ResourceManager.Legacy

### `@armOperationRoute` {#@Azure.ResourceManager.Legacy.armOperationRoute}

Signifies that an operation is an Azure Resource Manager operation
and optionally associates the operation with a route template.

```typespec
@Azure.ResourceManager.Legacy.armOperationRoute(route?: valueof Azure.ResourceManager.Legacy.ArmRouteOptions)
```

#### Target

The operation to associate the model with
`Operation`

#### Parameters

| Name  | Type                                                                                      | Description                                    |
| ----- | ----------------------------------------------------------------------------------------- | ---------------------------------------------- |
| route | [valueof `ArmRouteOptions`](./data-types.md#Azure.ResourceManager.Legacy.ArmRouteOptions) | Optional route to associate with the operation |

### `@armResourceRoute` {#@Azure.ResourceManager.Legacy.armResourceRoute}

Signifies that an interface contains resource operations
and optionally associates the operations with a route template.

```typespec
@Azure.ResourceManager.Legacy.armResourceRoute(routeOptions?: valueof Azure.ResourceManager.Legacy.ArmRouteOptions)
```

#### Target

The interface to associate the model with
`Interface`

#### Parameters

| Name         | Type                                                                                      | Description                                    |
| ------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------- |
| routeOptions | [valueof `ArmRouteOptions`](./data-types.md#Azure.ResourceManager.Legacy.ArmRouteOptions) | Optional route to associate with the interface |

### `@customAzureResource` {#@Azure.ResourceManager.Legacy.customAzureResource}

This decorator is used on resources that do not satisfy the definition of a resource
but need to be identified as such.

```typespec
@Azure.ResourceManager.Legacy.customAzureResource
```

#### Target

`Model`

#### Parameters

None

### `@externalTypeRef` {#@Azure.ResourceManager.Legacy.externalTypeRef}

Specify an external reference that should be used when emitting this type.

```typespec
@Azure.ResourceManager.Legacy.externalTypeRef(jsonRef: valueof string)
```

#### Target

`Model | ModelProperty`

#### Parameters

| Name    | Type             | Description                                                   |
| ------- | ---------------- | ------------------------------------------------------------- |
| jsonRef | `valueof string` | External reference(e.g. "../../common.json#/definitions/Foo") |
