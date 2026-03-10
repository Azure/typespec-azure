---
title: Network Security Perimeter Configurations
description: Adding Network Security Perimeter (NSP) Configuration operations to ARM resources
llmstxt: true
---

Network Security Perimeter (NSP) configurations allow users to manage perimeter-based network
access to a resource. Resource providers that support NSP configurations must declare an NSP
configuration resource type in their provider namespace and use the standard `NspConfigurations`
interface to expose operations.

:::note
Network Security Perimeter configurations require common types version `v5` or later. Make sure
your service version is configured with `@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)`
or a later version.
:::

## Defining an NSP Configuration Resource

To define an NSP configuration resource, create a model in your provider namespace that extends
`NspConfiguration`:

```typespec
model NetworkSecurityPerimeterConfiguration is Azure.ResourceManager.NspConfiguration;
```

## Defining NSP Configuration Operations

Create an alias for your NSP configuration operations using the `NspConfigurations` template:

```typespec
alias NspConfigurationOps = Azure.ResourceManager.NspConfigurations<NetworkSecurityPerimeterConfiguration>;
```

## Adding NSP Configuration Operations to Your Resource Interface

Add NSP configuration operations to your resource interface using the operations alias:

```typespec
@armResourceOperations
interface Employees {
  // ... other resource operations ...
  getNsp is NspConfigurationOps.Read<Employee>;
  listNsp is NspConfigurationOps.ListByParent<Employee>;
}
```

## Available Operations

The `NspConfigurations` interface provides the following operations:

| Operation    | Description                                     | TypeSpec Representation                         |
| ------------ | ----------------------------------------------- | ----------------------------------------------- |
| Read         | Get a single NSP configuration                  | `get is Ops.Read<ParentResource>;`              |
| ListByParent | List NSP configurations for a parent resource   | `list is Ops.ListByParent<ParentResource>;`     |
| Action       | Perform a synchronous action on an NSP config   | `action is Ops.Action<Parent, Req, Resp>;`      |
| ActionAsync  | Perform an asynchronous action on an NSP config | `action is Ops.ActionAsync<Parent, Req, Resp>;` |

## Complete Example

The following example shows a complete service with NSP configuration support:

```typespec
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using Rest;
using Versioning;
using Azure.Core;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "ContosoProviderHubClient" })
@versioned(Versions)
namespace Microsoft.ContosoProviderHub;

enum Versions {
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  `2025-11-19-preview`,
}

model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}

model EmployeeProperties {
  /** Age of employee */
  age?: int32;

  /** City of employee */
  city?: string;

  /** The status of the last operation. */
  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@lroStatus
union ProvisioningState {
  ResourceProvisioningState,
  Provisioning: "Provisioning",
  Updating: "Updating",
  Deleting: "Deleting",
  Accepted: "Accepted",
  string,
}

interface Operations extends Azure.ResourceManager.Operations {}

// 1. Define the NSP configuration resource model
model NetworkSecurityPerimeterConfiguration is Azure.ResourceManager.NspConfiguration;

// 2. Create the operations alias
alias NspConfigurationOps = Azure.ResourceManager.NspConfigurations<NetworkSecurityPerimeterConfiguration>;

// 3. Add operations to the resource interface
@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
  delete is ArmResourceDeleteSync<Employee>;
  listByResourceGroup is ArmResourceListByParent<Employee>;
  listBySubscription is ArmListBySubscription<Employee>;

  // NSP configuration operations
  getNsp is NspConfigurationOps.Read<Employee>;
  listNsp is NspConfigurationOps.ListByParent<Employee>;
}
```

## Using NSP Configurations with Child Resources

NSP configuration operations can also be used with child resources. You can reuse the same
operations alias across multiple resource interfaces:

```typespec
@parentResource(Employee)
model Dependent is ProxyResource<DependentProperties> {
  ...ResourceNameParameter<Dependent>;
}

@armResourceOperations
interface Dependents {
  get is ArmResourceRead<Dependent>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Dependent>;
  delete is ArmResourceDeleteSync<Dependent>;
  list is ArmResourceListByParent<Dependent>;

  // Reuse the same NSP configuration operations alias
  getNsp is NspConfigurationOps.Read<Dependent>;
  listNsp is NspConfigurationOps.ListByParent<Dependent>;
}
```
