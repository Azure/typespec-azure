---
title:  Library Tour
---

The `@azure-tools/typespec-azure-resource-manager` library defines the following artifacts:

- TypeSpec Azure Resource Manager Library
  - [Models](#models)
  - [Operations](#operations)
  - [Decorators](#decorators)
  - [API](#api)

## Models

The `@azure-tools/typespec-azure-resource-manager` library defines the following models:

### ARM Resource Models

The following table shows the list of ARM resource base model definitions. For the details of these different resource types, please consult [ARMWiki on resources.](https://armwiki.azurewebsites.net/introduction/concepts/resources.html)

| Model                           | Notes                             |
| ------------------------------- | --------------------------------- |
| TrackedResource<TProperties\>   | Defines an ARM tracked resource.  |
| ProxyResource<TProperties\>     | Defines an ARM proxy resource     |
| ExtensionResource<TProperties\> | Defines an ARM extension resource |

### Other Support Models

The following models are used for different purposes:

- Base: Base models used for defining other models
- Common: Common definition models that can be spread(`...`) into resources
- Response: Common response models can be used in custom action operation return types.
- Parameter: Common parameter models can be used to define custom action operation APIs and formulate the REST path.
- Helper: Helper models for tasks such as extract model properties or transformations.

| Model                                  | Category  | Notes                                                                                                                                                                                                                                                    |
| -------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ArmResource                            | Base      | Defines the base model with common properties for all ARM resources.                                                                                                                                                                                     |
| armResourceIdentifier<T\>                 | Common    | A type definition that refers the id to an ARM resource. Sample usage: ` otherArmId: ResourceIdentifier; networkId: armResourceIdentifier<[{type:"\\Microsoft.Network\\vnet"}]> vmIds: armResourceIdentifier<[{type:"\\Microsoft.Compute\\vm", scopes["*"]}]>` |
| DefaultProvisioningStateProperty       | Common    | Contains a default provisioningState property to be spread into resource property types. Available values: `Succeeded`, `Failed`, and `Cancelled`                                                                                                        |
| ManagedServiceIdentity                 | Common    | The managed service identities envelope.                                                                                                                                                                                                                 |
| EntityTag                              | Common    | The eTag property envelope.                                                                                                                                                                                                                              |
| ManagedBy                              | Common    | The managedBy property envelope.                                                                                                                                                                                                                         |
| ResourceKind                           | Common    | The resource kind property envelope.                                                                                                                                                                                                                     |
| ResourcePlan                           | Common    | The resource plan property envelope.                                                                                                                                                                                                                     |
| ResourceSku                            | Common    | The SKU (Stock Keeping Unit) assigned to this resource.                                                                                                                                                                                                  |
| ArmResponse<T\>                        | Response  | Response model for ARM operation completed successfully. Status code: 200                                                                                                                                                                                |
| ArmCreatedResponse                     | Response  | Response model for ARM create operation completed successfully. Status code: 201                                                                                                                                                                         |
| ArmDeletedResponse                     | Response  | Response model for ARM resource deleted successfully. Status code: 200                                                                                                                                                                                   |
| ArmDeleteAcceptedResponse              | Response  | Response model for ARM resource deletion accepted. Status code: 202                                                                                                                                                                                      |
| ArmDeletedNoContentResponse            | Response  | Response model for ARM delete operation completed successfully. Status code: 204                                                                                                                                                                         |
| ArmNoContentResponse<TMessage\>        | Response  | Response model for ARM operation completed with status code 204.                                                                                                                                                                                         |
| ErrorResponse                          | Response  | Common error response for all Azure Resource Manager APIs to return error details for failed operations.                                                                                                                                                 |
| ApiVersionParameter                    | Parameter | The default api-version parameter type.                                                                                                                                                                                                                  |
| SubscriptionIdParameter                | Parameter | The default subscriptionId parameter type.                                                                                                                                                                                                               |
| ResourceGroupParameter                 | Parameter | The default resource group parameter type.                                                                                                                                                                                                               |
| ProviderNamespace<TResource\>          | Parameter | The provider namespace parameter type.                                                                                                                                                                                                                   |
| ResourceInstanceParameters<TResource\> | Parameter | A composite parameter model that includes `ResourceCommonParameters` and the key of `KeyOf<TResource>`.                                                                                                                                                  |
| SubscriptionScope<TResource\>          | Parameter | A composite parameter for subscription level operations. It includes `ApiVersionParameter`, `SubscriptionIdParameter`, `ProviderNamespace<TResource>`, and `ParentKeysOf<TResource>`                                                                     |
| ResourceGroupScope<TResource\>         | Parameter | A composite parameter for resource group level operations. It includes `ApiVersionParameter`, `SubscriptionIdParameter`,`ResourceGroupParameter`,`ProviderNamespace<TResource>`, and `ParentKeysOf<TResource>`                                           |
| TenantParentScope<TResource\>          | Parameter | A composite parameter for tenante level operations. It includes `CommonTenantScope<TResource\>`, `ParentKeysOf<TResource>`.                                                                                                                              |
| TenantInstanceParameters<TResource\>   | Parameter | A composite parameter for tenante level operations. It includes `CommonTenantScope<TResource\>`, `KeysOf<TResource>`.                                                                                                                                    |
| ResourceUriParameter                   | Parameter | The default resourceUri parameter type that refers to a fully qualified Azure Resource manager identifier of the resource. It sets `x-ms-skip-url-encoding` to true for this route segment.                                                              |
| OperationIdParameter                   | Parameter | The default operationId parameter type.                                                                                                                                                                                                                  |
| KeysOf<TResource\>                     | Helper    | The model extract the ARM resource name key.                                                                                                                                                                                                             |
| ParentKeysOf<TResource\>               | Helper    | The model extract the ARM resource's immediate parent's name key.                                                                                                                                                                                        |

## Interfaces

The `@azure-tools/typespec-azure-resource-manager` library defines these standard interfaces as basic building blocks that you can expose. You can use `extends` to compose the operations to meet the exact needs of your APIs.

For tracked resources, it is expected to implement the full `ResourceOperations` interface.
For other resource types, you can use these basic interfaces to compose desired APIs. Certain linting rules may apply.

```typespec
model Employee is TrackedResource<EmployeeProperties>
...

@armResourceOperations
interface Employees extends TrackedResourceOperations<Employee, EmployeeProperties> {}

------
model Widget is ProxyResource<WidgetProperties>
...

@armResourceOperations
interface Widgets extends extends ResourceRead<Widget>,
 ResourceCreate<Widget>,
 ResourceDelete<Widget> {}

```

| Interface                                                    | Notes                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Operations                                                   | Standard interface that provides ARM required Operation API. Each service should have exact ONE definition with following line. `interface Operations extends Azure.ResourceManager.Operations {}`                                                         |
| TenantResourceOperations<TResource, TProperties\>            | A composite interface for Tenant resource that include `TenantResourceRead<TResource>`, `TenantResourceCreate<TResource>`, `TenantResourceUpdate<TResource, TProperties>`, `TenantResourceDelete<TResource>`, and `TenantResourceListByParent<TResource>`. |
| TenantResourceRead<TResource\>                               | A interface definition for Tenant resource Read operation.                                                                                                                                                                                                 |
| TenantResourceCreate<TResource\>                             | A interface definition for Tenant resource CreateOrUpdate operation.                                                                                                                                                                                       |
| TenantResourceUpdate<TResource, TProperties\>                | A interface definition for Tenant resource Update operation.                                                                                                                                                                                               |
| TenantResourceDelete<TResource\>                             | A interface definition for Tenant resource Delete operation.                                                                                                                                                                                               |                                    |
| TenantResourceListByParent<TResource\>                       | A interface definition for Tenant resource ListByParent operation.                                                                                                                                                                                         |
| ResourceOperations<TResource, TProperties\>                  | A composite interface for resources that include `ResourceInstanceOperations<TResource, TProperties>`, `ResourceCollectionOperations<TResource>`.                                                                                                          |
| ResourceInstanceOperations<TResource, TProperties\>          | A composite interface for resources that include `ResourceRead<TResource>`,`ResourceCreate<TResource>`,`ResourceUpdate<TResource, TProperties>`,`ResourceDelete<TResource>`.                                                                               |
| ResourceCollectionOperations<TResource\>                     | A composite interface for resources that include `ResourceListByParent<TResource>`,`ResourceListBySubscription<TResource>`.                                                                                                                                |
| ResourceRead<TResource\>                                     | A interface definition for resource Read operation.                                                                                                                                                                                                        |
| ResourceCreate<TResource\>                                   | A interface definition for resource CreateOrUpdate operation.                                                                                                                                                                                              |
| ResourceUpdate<TResource, TProperties\>                      | A interface definition for resource Update operation.                                                                                                                                                                                                      |
| ResourceDelete<TResource\>                                   | A interface definition for resource Delete operation.                                                                                                                                                                                                      |
| ResourceListBySubscription<TResource\>                       | A interface definition for resource ListBySubscription operation.                                                                                                                                                                                          |
| ResourceListByParent<TResource\>                             | A interface definition for resource ListByParent operation.                                                                                                                                                                                                |
| ProxyResourceOperations                                      | A composite interface for Proxy resource that include `ResourceRead<TResource>`,`ResourceCreate<TResource>`,`ResourceDelete<TResource>`,`ResourceListByParent<TResource>`.                                                                                 |
| ProxyResourceUpdate<TResource, TProperties\>                 | A interface definition for Proxy resource Update operation.                                                                                                                                                                                                |
| ExtensionResourceOperations<TResource, TProperties\>         | A composite interface for Extension resources that include `ExtensionResourceInstanceOperations<TResource, TProperties>`, `ExtensionResourceCollectionOperations<TResource>`.                                                                              |
| ExtensionResourceInstanceOperations<TResource, TProperties\> | A composite interface for Extension resources that include `ExtensionResourceRead<TResource>`,`ExtensionResourceCreate<TResource>`,`ExtensionResourceUpdate<TResource, TProperties>`,`ExtensionResourceDelete<TResource>`.                                 |
| ExtensionResourceCollectionOperations<TResource\>            | A composite interface for Extension resources that include `ExtensionResourceList<TResource>`.                                                                                                                                                             |
| ExtensionResourceRead<TResource\>                            | A interface definition for Extension resource Read operation.                                                                                                                                                                                              |
| ExtensionResourceCreate<TResource\>                          | A interface definition for Extension resource CreateOrUpdate operation.                                                                                                                                                                                    |
| ExtensionResourceUpdate<TResource, TProperties\>             | A interface definition for Extension resource Update operation.                                                                                                                                                                                            |
| ExtensionResourceDelete<TResource\>                          | A interface definition for Extension resource Delete operation.                                                                                                                                                                                            |
| ExtensionResourceList<TResource\>                            | A interface definition for Extension resource List operation.                                                                                                                                                                                              |

## Decorators

The `@azure-tools/typespec-azure-resource-manager` library defines the following decorators:

| Declarator             | Scope      | Usage                                                                                           |
| ---------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| @armProviderNamespace  | namespace  | sets the ARM provider namespace.                                                                |
| @armResourceOperations | interfaces | This decorator is used to identify interfaces containing resource operations.                   |
| @singleton             | models     | This decorator is used to mark a resource type as a "singleton", a type with only one instance. |

## API

The `@azure-tools/typespec-azure-resource-manager` library defines the following API functions that emitter authors can use for development:

| Name                    | Entity                     | Returns                      | Description                                                                                                                    |
| ----------------------- | -------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| isArmCommonType         | models and modelProperties | boolean                      | Check if a given model or model property is an ARM common type.                                                                |
| isSingletonResource     | models                     | boolean                      | Check if a given model or model property is a singleton resource.                                                              |
| getArmProviderNamespace | namespace and models       | string or undefined          | Get the ARM provider namespace for a given entity                                                                              |
| getArmResources         | -                          | ArmResourceDetails[]         | Returns fully-resolved details about all ARM resources registered in the TypeSpec document including operations and their details. |
| getArmResourceInfo      | models                     | ArmResourceDetails           | Returns fully-resolved details about a given ARM resource model.                                                               |
| getArmResourceKind      | models                     | ArmResourceKind or undefined | Returns resource type for a given ARM resource model. Return values: `TrackedResource`, `ProxyResource`, `ExtensionResource`   |
| getSingletonResourceKey | models                     | string or undefined          | Returns the name/key of a singleton resource or `undefined` for non-singleton resources.                                       |
