---
title: ARM Resource Types
---

## Introductions

Introduction
Resources are the basic building blocks of Azure. When a customer interacts with Azure through the Control Plane (ARM), they generally will be reading (GET), writing (PUT/PATCH), deleting (DELETE) or performing actions upon (POST) one or more resources. Each resource is managed by a particular Resource Provider, so we uniquely identify a resource by its 'fully-qualified type'. Some well-known examples of types are Microsoft.Compute/virtualMachines, or Microsoft.Network/networkSecurityGroups/securityRules. See Resource Ids for a more in-depth breakdown of the id and associated fields.

In order to give customers a consistent API when working with many different Resource Providers, and to allow ARM to understand and manage resources programmatically, ARM requires each RP to follow a set of contracts for resource management, defined in the ARM RPC.

## ARM Resource Terminology

The most important distinction between resources is between _Tracked_ and _Proxy_ resources. Tracked resources are resources in which all of the metadata is maintained in Azure Resource Manager. Tracked Resources can be targeted to specific regions, and are generally the best choice for most top-level resources. Azure Resource Manager maintains data about Tracked Resources, and generally will handle many implementation details or operations on the resource. See [RPC: Resource API Reference](https://github.com/Azure/azure-resource-manager-rpc/blob/master/v1.0/resource-api-reference.md) for further information on the contract for Tracked Resources.

Proxy resources are resources in which only a portion of resource metadata is tracked in ARM. Generally, these model resources maintained on other systems, or that resource-providers want to track themselves. Generally, resource providers must implement most of the operations for Proxy resources. Tenant, Extension, and child resources are usually modeled as Proxy resources.

There is a good discussion on making the choice between Tracked and Proxy Resources in the armwiki discussion [Tracked vs Proxy Resources](https://armwiki.azurewebsites.net/rp_onboarding/tracked_vs_proxy_resources.html)

## Choosing a Resource Type

- The large majority of resources have their metadata tracked by ARM, can be assigned to regions, and are contained inside a resource group in a subscription, for ease of management and billing. These are called [Tracked Resources](#tracked-resources).
- Some resources may need to have scope across an entire customer tenant, or may need to have a single instance across all customer subscriptions. These are called [tenant resources](#tenant-resources).
- Some kinds of resources may augment or alter the functionality of resources or resource containers provided by other resource-providers. For example, policy or RBAC rules may be applied to any resource or resource container. These resources are called [extension resources](#extension-resource).
- Some resources are complex and naturally break down into one or more components that are separately configurable, but an integral part of the larger resource (for example, a virtual network resource may contain many separately configurable subnets). These component resources are called [child resources](#child-resource).
- Rarely, some resources may need to apply across a subscription, or have a single instance in a customer subscription, these are called [subscription-based resources](#subscription-based-resource).
- Rarer still, some resources may need to apply across a specific region, or have a single instance in a region, these are called [location-based resources](#location-based-resource).
- In some cases, there can only be one instance of a resource at a specific scope - this is rare, but happens most frequently in tenant, child, and location resources. In typespec, you will need to specify that the resource is a singleton, and the resource manager tools will automatically apply the correct pattern for singleton resources (using the recommended resource name 'default')

## Modeling Resources in TypeSpec

Resources are modeled in TypeSpec by choosing a _base resource type_, defining _rp-specific properties_, and optionally mixing in _standard envelope properties_. Later sections document [how to model resource operations](./resource-operations.md). The following sections discuss usage of each of the base resource types. Later sections discuss [designing rp-specific properties](#designing-resource-specific-properties) and [adding standard ARM envelope properties](#adding-optional-standard-envelope-properties).

### Tracked Resources

Tracked resources use the `TrackedResource<TProperties/>` as their base resource type, where `TProperties` is the properties model for the rp-specific properties of the resource. Here is an example:

```typespec
model EmployeeResource is TrackedResource<EmployeeProperties> {
  @doc("The employee name, using 'Firstname Lastname' notation")
  @segment("employees")
  @key("employeeName")
  @visibility("read")
  @path
  name: string;
}
```

`@doc`: provides documentation for the 'name' property of the resource.
`@segment(employees)`: provides the resource type name for this resource.
`@key(employeeName)`: provides the parameter name for the name of the resource in operations that use this resource.
`@visibility(read)`: indicates that this property is returned in the body of responses to operations over this resource, but does not appear in the body of requests. Later sections describe the [usage of property visibility](#property-visibility-and-other-constraints).
`@path`: indicates that this property corresponds to the last segment of the url path to the resource (otherwise known as the resource identity).

You can find samples of Tracked Resources [in the DynaTrace sample](https://github.com/Azure/typespec-azure/blob/main/packages/samples/specs/resource-manager/dynatrace/main.tsp).

### Tenant Resources

Tenant resources use the `ProxyResource<TProperties/>` as their base resource type, where `TProperties` is the properties model for the rp-specific properties of the resource. Here is an example:

```typespec
@tenantResource
model EmployeeResource is ProxyResource<EmployeeProperties> {
  @doc("The employee name, using 'Firstname Lastname' notation")
  @segment("employees")
  @key("employeeName")
  @visibility("read")
  @path
  name: string;
}
```

`@tenantResource`: designates this resource as being a cross-tenant resource, with scope across all customer subscriptions in the tenant.
`@doc`: provides documentation for the 'name' property of the resource.
`@segment(employees)`: provides the resource type name for this resource.
`@key(employeeName)`: provides the parameter name for the name of the resource in operations that use this resource.
`@visibility(read)`: indicates that this property is returned in the body of responses to operations over this resource, but does not appear in the body of requests. Later sections describe the [usage of property visibility](#property-visibility-and-other-constraints).
`@path`: indicates that this property corresponds to the last segment of the url path to the resource (otherwise known as the resource identity).

You can find samples of Tenant Resources [in the TenantResource sample](https://github.com/Azure/typespec-azure/blob/main/packages/samples/specs/resource-manager/tenantResource/main.tsp).

### Extension Resource

Extension resources use the `ExtensionResource<TProperties/>` as their base resource type, where `TProperties` is the properties model for the rp-specific properties of the resource. Here is an example:

```typespec
model EmployeeResource is ExtensionResource<EmployeeProperties> {
  @doc("The employee name, using 'Firstname Lastname' notation")
  @segment("employees")
  @key("employeeName")
  @visibility("read")
  @path
  name: string;
}
```

`@doc`: provides documentation for the 'name' property of the resource.
`@segment(employees)`: provides the resource type name for this resource.
`@key(employeeName)`: provides the parameter name for the name of the resource in operations that use this resource.
`@visibility(read)`: indicates that this property is returned in the body of responses to operations over this resource, but does not appear in the body of requests. Later sections describe the [usage of property visibility](#property-visibility-and-other-constraints).
`@path`: indicates that this property corresponds to the last segment of the url path to the resource (otherwise known as the resource identity).

You can find samples of Extension Resources [in the TenantResource sample](https://github.com/Azure/typespec-azure/blob/main/packages/samples/specs/resource-manager/tenantResource/main.tsp).

### Child Resource

Child resources usually use the `ProxyResource<TProperties/>` as their base resource type, where `TProperties` is the properties model for the rp-specific properties of the resource. Here is an example:

```typespec
@parentResource(EmployeeResource)
model JobResource is ProxyResource<JobProperties> {
  @doc("The job name")
  @segment("jobs")
  @key("jobName")
  @visibility("read")
  @path
  name: string;
}
```

`@parentResource`: designates the model type for the parent of this child resource. The resource identifier for this resource will be prepended with the resource identity of the parent.
`@doc`: provides documentation for the 'name' property of the resource.
`@segment(employees)`: provides the resource type name for this resource.
`@key(employeeName)`: provides the parameter name for the name of the resource in operations that use this resource.
`@visibility(read)`: indicates that this property is returned in the body of responses to operations over this resource, but does not appear in the body of requests. Later sections describe the [usage of property visibility](#property-visibility-and-other-constraints).
`@path`: indicates that this property corresponds to the last segment of the url path to the resource (otherwise known as the resource identity).

You can find samples of Child Resources [in the DynaTrace sample](https://github.com/Azure/typespec-azure/blob/main/packages/samples/specs/resource-manager/dynatrace/main.tsp).

### Subscription-based Resource

Tenant resources use the `ProxyResource<TProperties/>` as their base resource type, where `TProperties` is the properties model for the rp-specific properties of the resource. Here is an example:

```typespec
@subscriptionResource
model EmployeeResource is ProxyResource<EmployeeProperties> {
  @doc("The employee name, using 'Firstname Lastname' notation")
  @segment("employees")
  @key("employeeName")
  @visibility("read")
  @path
  name: string;
}
```

`@subscriptionResource`: designates this resource as being a cross-subscription resource, with scope across all resource groups in the subscription.
`@doc`: provides documentation for the 'name' property of the resource.
`@segment(employees)`: provides the resource type name for this resource.
`@key(employeeName)`: provides the parameter name for the name of the resource in operations that use this resource.
`@visibility(read)`: indicates that this property is returned in the body of responses to operations over this resource, but does not appear in the body of requests. Later sections describe the [usage of property visibility](#property-visibility-and-other-constraints).
`@path`: indicates that this property corresponds to the last segment of the url path to the resource (otherwise known as the resource identity).

You can find samples of Subscription Resources [in the OperationTemplates sample](https://github.com/Azure/typespec-azure/blob/main/packages/samples/specs/resource-manager/operationsTest/opTemplates.tsp).

### Location-based Resource

Location-based resources usually use the `ProxyResource<TProperties/>` as their base resource type, where `TProperties` is the properties model for the rp-specific properties of the resource. Here is an example:

```typespec
@locationResource
model EmployeeResource is ProxyResource<EmployeeProperties> {
  @doc("The employee name, using 'Firstname Lastname' notation")
  @segment("employees")
  @key("employeeName")
  @visibility("read")
  @path
  name: string;
}
```

`@locationResource`: designates this resource as being a cross-location resource, with scope across a location within a subscription.
`@doc`: provides documentation for the 'name' property of the resource.
`@segment(employees)`: provides the resource type name for this resource.
`@key(employeeName)`: provides the parameter name for the name of the resource in operations that use this resource.
`@visibility(read)`: indicates that this property is returned in the body of responses to operations over this resource, but does not appear in the body of requests. Later sections describe the [usage of property visibility](#property-visibility-and-other-constraints).
`@path`: indicates that this property corresponds to the last segment of the url path to the resource (otherwise known as the resource identity).

You can find samples of Location Resources [in the OperationTemplates sample](https://github.com/Azure/typespec-azure/blob/main/packages/samples/specs/resource-manager/operationsTest/opTemplates.tsp).

### Singleton Resource

Singleton resources can use any resource base type, but most often use `ProxyResource<TProperties/>` as their base resource type, where `TProperties` is the properties model for the rp-specific properties of the resource. Here is an example:

```typespec
@singleton
@tenantResource
model EmployeeAgreementResource is ProxyResource<EmployeeAgreementProperties> {
  @doc("The default employee agreement, applying to all employees.")
  @segment("employeeAgreements")
  @key
  @visibility("read")
  @path
  name: string;
}
```

`@singleton`: indicates that there can only be one of the resources in the resource container (in this case, only one instance in the customer tenant).
`@tenantResource`: designates this resource as being a cross-tenant resource, with scope across all customer subscriptions in the tenant.
`@doc`: provides documentation for the 'name' property of the resource. For a singleton, the name value will always be the same.
`@segment(employeeAGreements)`: provides the resource type name for this resource.
`@key`: provides the parameter name for the name of the resource in operations that use this resource - this will not be a settable value for singleton resources.
`@visibility(read)`: indicates that this property is returned in the body of responses to operations over this resource, but does not appear in the body of requests. Later sections describe the [usage of property visibility](#property-visibility-and-other-constraints).
`@path`: indicates that this property corresponds to the last segment of the url path to the resource (otherwise known as the resource identity).

You can find samples of Singleton Resources [in the Singleton sample](https://github.com/Azure/typespec-azure/blob/main/packages/samples/specs/resource-manager/arm-scenarios/singleton/main.tsp#L29).

## Designing Resource-specific Properties

Each resource model consists of two distinct parts

- An outer _envelope_ of information that provides metadata for optional standardized ARM functionality, like entity-tags and managed identities, and is processed by Azure Resource Manager.
- An inner set of properties that are specific to the resource and are defined by the resource provider.

Modifying the ARM envelope is discussed in later sections on [mixing in standard ARM envelope add-ons](#adding-optional-standard-envelope-properties).

The inner _rp-specific property bag_ consists of all of the properties that the RP needs to manage about the resource. Properties should be completely specified, should not duplicate properties from the _ARM envelope_, and may consist of simple types, arrays, or other complex properties.

Here is an example of a property bag for the `EmployeeResource` resource.

```typespec
model EmployeeResource is TrackedResource<EmployeeProperties> {
  @doc("The employee name, using 'Firstname Lastname' notation")
  @segment("employees")
  @key("employeeName")
  @visibility("read")
  @path
  name: string;
}

union EmployeeProvisioningState {
  string,

  /** The resource create request has been accepted */
  Accepted: "Accepted",

  /** The resource is being provisioned */
  Provisioning: "Provisioning",

  /** The resource is updating */
  Updating: "Updating",

  /** Resource has been created. */
  Succeeded: "Succeeded",

  /** Resource creation failed. */
  Failed: "Failed",

  /** Resource creation was canceled. */
  Canceled: "Canceled",

  /** The resource is being deleted */
  Deleting: "Deleting",
}

@minValue(50)
@maxValue(70)
scalar EmployeeLevel extends int32;

scalar EmployeeResourceId
  extends Azure.Core.armResourceIdentifier<[
    {
      type: "Microsoft.HR/employees",
    }
  ]>;

@secret
scalar Password extends string;

model Job {
  name: string;
  companyName: string;
  start: plainDate;
  end: plainDate;
  role: string;
  notes?: string;
}

model EmployeeProperties {
  @doc("The current title of the employee")
  title: string;

  @visibility("read", "create")
  level: EmployeeLevel;

  @visibility("read")
  employeeId: int32;

  biography?: string = "No biography provided";
  colleagues: EmployeeResourceId[];
  employmentHistory: Job[];

  @visibility("create")
  password: Password;

  provisioningState?: EmployeeProvisioningState;
}
```

`EmployeeProperties` specifies the employee metadata that the RP needs to track and manage. Notice that the model uses built-in scalar types like `string` and `int32`, new types built from scalar types with added constraints, like `Password` and `EmployeeLevel`, enumerations of values, like `EmployeeProvisioningState`, and complex types. The individual components of this model are described below.

Note that _documentation comments on all models and model properties are required when specs are checked in_. Here they are omitted for clarity. The TypeSpec compiler and TypeSpec IDE tooling will emit warning diagnostics if you emit required documentation, and about most of the ARM rules described in this document.

### The `provisioningState` Property for Tracked Resources

All Tracked Resources are required to implement a 'provisioningState' property in their rp-specific property bag. This is used by ARM and some ARM clients to track the provisioning state of a resource as it is created and deleted. At minimum, the provisioning state must contain the standard terminal values that ARM is looking for. There are contained in the `ResourceProvisioningState` enumeration in the Azure.ResourceManager library. If RPs have other provisioning states they would like to track, they can define their own provisioning state enum, and mix in the value, as shown in the sample above, or they may simply use the standard provisioning state as shown in the sample below:

```typespec
model ResourceProperties {
  ...ResourceProvisioningState;
}
```

Note that this example uses the spread operator `...`, which allows you to simply include the properties from a source model in the target model you are constructing. This has the effect of copying the properties of the source model and their decorations into the target model, without creating any nominal inheritance relationship.

Alternately, this is also equivalent:

```typespec
model ResourceProperties {
  @doc("The status of the last provisioning operation performed on the resource.")
  @visibility("read")
  provisioningState?: ResourceProvisioningState;
}
```

### Required and Optional properties and Property Defaults

In the examples, note that some model properties use the optional operator `?` after the property name, like `biography?` and some do not, like `title`. Property names using the `?` are optional properties, which may or may not be provided in the request body for CreateOrUpdate (PUT) requests. Property names without the `?` are required properties, which must be provided in PUT requests. The exception is that properties that have 'readOnly' visibility do not appear in requests, but may be required or optional in responses.

Also note that optional properties may specify defaults, as with `biography?: string = "No biography provided"`. The default indicates the value that will be recorded on the server if no value is sent by the client.

### Defining Custom Types

In the sample, new constrained scalar types and new complex model types are defined and used inside the _rp-specific property bag_. TypeSpec allows you to define custom types for use in your specification.

You will often want to define scalar types or properties that have constraints. For example, numeric values may be constrained to have a certain minimum or maximum, strign values may be constrained to follow a particular regex pattern, and so on. Whenever these constrained types are used in your spec, the constraints will be transmitted to the usage.

The example creates a numeric type with minimum and maximum constraints:

```typespec
@minValue(50)
@maxValue(70)
scalar EmployeeLevel extends int32;
```

This defines 'EmployeeLevel' as an integer value between 50 and 70. The example also defines a complex type used in an array:

```typespec
model Job {
  name: string;
  companyName: string;
  start: plainDate;
  end: plainDate;
  role: string;
  notes?: string;
}
```

Mode details on what to consider when using complex types in an array are discussed in the section on [modeling arrays of complex types](#modeling-arrays-of-complex-types).

### Using Resource identifiers

It is often the case that resources need to reference other resources to provide specific pieces of functionality. For example, resources may need to reference a storage account to use for storing user data, or a NIC to attach to a Network. The `Azure.ResourceManager` library defines a `ResourceIdentifier` template that allows you to easily represent references to resources in your API. The template allows you to specify one or more acceptable resource types, automatically designating the value as a resource reference, and providing the appropriate pattern validation - which helps in generating better code, better ARM templates, and better documentation for your API.

```typespec
scalar EmployeeResourceId
  extends Azure.Core.armResourceIdentifier<[
    {
      type: "Microsoft.HR/employees",
    }
  ]>;

scalar NetworkInterfaceId
  extends Azure.Core.armResourceIdentifier<[
    {
      type: "Microsoft.Network/networkInterfaces",
    },
    {
      type: "Microsoft.ClassicNetwork/networkInterfaces",
    }
  ]>;
```

The `NetworkInterfaceId example shows how to allow multiple resource types in a reference.

### Property Visibility and Other Constraints

The sample uses the `@visibility` decorator to indicate how the resource definition is used in requests to PUT and PATCH operations, and in responses to PUT, PATCH, GET, and LIST operations.

This table shows how visibility is used to determine whether a property is used in requests and responses:

| Visibility           | In Create Request? | In Patch Request/ Updateable in PUT | In Responses | Sample                                         |
| -------------------- | ------------------ | ----------------------------------- | ------------ | ---------------------------------------------- |
| None                 | Yes                | Yes                                 | Yes          | Most properties                                |
| read, create, update | Yes                | Yes                                 | Yes          | Most properties                                |
| read, create         | Yes                | No                                  | Yes          | resource location                              |
| read, update         | No                 | Yes                                 | Yes          | Properties only settable after creation (keys) |
| create, update       | Yes                | Yes                                 | No           | Secrets (e.g. password)                        |
| read                 | No                 | No                                  | Yes          | Calculated properties, e.g. provisioningState  |
| update               | No                 | Yes                                 | No           | Secrets (e.g. keys)                            |
| create               | Yes                | No                                  | No           | Secrets (e.g. user-defined password)           |

### Modeling Arrays of Complex Types

Finally, when your _rp-specific property bag_ contains an array of complex properties, there are a few important considerations:

- The complex properties in an array must have a key property - this means a property named 'name' or 'id' that uniquely identifies the property in the array. The TypeSpec tools will emit a diagnostic if you omit this.
- ARM resources must be fully loaded in memory, so there are limits to the size of arrays in the properties of a resource. If your array is not strictly bounded, you should consider modeling the array property as a [child resource](#child-resource)
- Updating the contents of arrays can be difficult, and result in data loss under simultaneous updates, especially as Json-Merge-Patch is not widely supported in ARM update operations. If users will frequently need to update the contents of arrays, you should consider modeling as a [child resource](#child-resource).

## Adding Optional Standard Envelope Properties

In addition to the resource-specific property bag, a resource may configure on or more standard ARM features through the use of standard properties in the _ARM Envelope_. Standard features configured in the envelope include:

- **Managed Identity**: Associating a managed identity with the resource to authorize actions taken by this resource on other resources.
- **SKU**: A standard mechanism for configuring levels of service for a resource.
- **Plan**: A standard mechanism for configuring MarketPlace billing plans for a resource.
- **ETags**: A standard mechanism for managing concurrent operations over the resource.
- **ResourceKind**: A standard mechanism for specifying a type of user experience in the portal.

### Managed Identity

Standard configuration for ARM support of both SystemAssigned and UserAssigned Managed Service Identity (MSI)

- If a resource allows both generated (SystemAssigned) and user-assigned (UserAssigned) Managed Identity, use the spread (...) operator to include the standard ManagedServiceIdentity envelope property. This will allow users to manage any ManagedServiceIdentity associated with this resource.

  ```typespec
  model EmployeeResource is TrackedResource<EmployeeProperties> {
    @doc("The employee name, using 'Firstname Lastname' notation")
    @segment("employees")
    @key("employeeName")
    @visibility("read")
    @path
    name: string;

    ...ManagedServiceIdentity;
  }
  ```

- If a resource allows only generated (SystemAssigned) Managed Identity, use the spread operator (...) to include the `ManagedSystemAssignedIdentity` standard envelope property in the resource definition. This will allow users to manage the SystemAssigned identity associated with this resource.

  ```typespec
  model EmployeeResource is TrackedResource<EmployeeProperties> {
    @doc("The employee name, using 'Firstname Lastname' notation")
    @segment("employees")
    @key("employeeName")
    @visibility("read")
    @path
    name: string;

    ...ManagedSystemAssignedIdentity;
  }
  ```

For more information, see [Managed Service Identity Support](https://eng.ms/docs/products/arm/rpaas/msisupport)

### SKU

Standard support for setting a SKU-based service level for a resource. To enable SKU support, add the `ResourceSku` enevelope property to the resource definition:

```typespec
model EmployeeResource is TrackedResource<EmployeeProperties> {
  @doc("The employee name, using 'Firstname Lastname' notation")
  @segment("employees")
  @key("employeeName")
  @visibility("read")
  @path
  name: string;

  ...ResourceSku;
}
```

For more information, see [SKU Support](https://eng.ms/docs/products/arm/rpaas/skusupport)

### ETags

Indicator that entity-tag operation concurrency support is enabled for this resource. To enable ETags, add the `EntityTag` envelope property to the resource definition.

```typespec
model EmployeeResource is TrackedResource<EmployeeProperties> {
  @doc("The employee name, using 'Firstname Lastname' notation")
  @segment("employees")
  @key("employeeName")
  @visibility("read")
  @path
  name: string;

  ...EntityTag;
}
```

For more information, and limitations on RPaaS concurrency support, see [RPaaS ETag Support](https://eng.ms/docs/products/arm/rpaas/etags)

### Plan

Support for marketplace billing configuration for the resource. To enable `Plan` support, add the `ResourcePlan` standard envelope property to the resource definition.

```typespec
model EmployeeResource is TrackedResource<EmployeeProperties> {
  @doc("The employee name, using 'Firstname Lastname' notation")
  @segment("employees")
  @key("employeeName")
  @visibility("read")
  @path
  name: string;

  ...ResourcePlan;
}
```

See [MarketPlace Third Party Billing SUpport](https://eng.ms/docs/products/arm/rpaas/custom_billing)

### ResourceKind

Support for certain kinds of portal user experiences based on the kind of resource. To include 'Kind' in the resource defintion, add the `ResourceKind` standard envelope property.

```typespec
model EmployeeResource is TrackedResource<EmployeeProperties> {
  @doc("The employee name, using 'Firstname Lastname' notation")
  @segment("employees")
  @key("employeeName")
  @visibility("read")
  @path
  name: string;

  ...ResourceKind;
}
```

For more information on user experiences in the Azure Portal, see [Portal Support](https://eng.ms/docs/products/arm/rpaas/portal/gettingstarted)

### ManagedBy

Support for management of this resource by other resources. To add 'ManagedBy' support to the resource, add the `ManagedBy` envelope property to the resource definition:

```typespec
model EmployeeResource is TrackedResource<EmployeeProperties> {
  @doc("The employee name, using 'Firstname Lastname' notation")
  @segment("employees")
  @key("employeeName")
  @visibility("read")
  @path
  name: string;

  ...ManagedBy;
}
```

For more information on supporting 'ManagedBy', see [ManagedBy API Contract](https://eng.ms/docs/products/arm/api_contracts/managedby)

## Reference

[Fundamentals - ARM Wiki](https://armwiki.azurewebsites.net/fundamentals/overview.html)
