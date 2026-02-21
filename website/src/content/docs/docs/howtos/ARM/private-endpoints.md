---
title: Private Endpoints
description: Adding Private Endpoint Connection operations to ARM resources
llmstxt: true
---

Private Endpoint Connections allow users to manage private network access to a resource. Resource
providers that support private endpoint connections must declare a private endpoint connection
resource type in their provider namespace and use the standard `PrivateEndpoints` interface to
expose operations.

## Defining a Private Endpoint Connection Resource

To define a private endpoint connection resource, create a model in your provider namespace that
extends `PrivateEndpointConnectionResource`:

```typespec
model PrivateEndpointConnection is PrivateEndpointConnectionResource;
```

## Defining Private Endpoint Operations

Create an alias for your private endpoint operations using the `PrivateEndpoints` interface
template:

```typespec
alias PrivateEndpointOps = PrivateEndpoints<PrivateEndpointConnection>;
```

## Adding Private Endpoint Operations to Your Resource Interface

Add private endpoint operations to your resource interface using the operations alias:

```typespec
@armResourceOperations
interface Employees {
  // ... other resource operations ...
  getConnection is PrivateEndpointOps.Read<Employee>;
  createOrUpdateConnection is PrivateEndpointOps.CreateOrUpdateAsync<Employee>;
  updateConnection is PrivateEndpointOps.CustomPatchAsync<Employee>;
  deleteConnection is PrivateEndpointOps.DeleteAsync<Employee>;
  listConnections is PrivateEndpointOps.ListByParent<Employee>;
}
```

## Available Operations

The `PrivateEndpoints` interface provides the following operations:

| Operation            | Description                                           | TypeSpec Representation                               |
| -------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| Read                 | Get a private endpoint connection                     | `get is Ops.Read<ParentResource>;`                    |
| CreateOrUpdateAsync  | Create or update a connection (async)                 | `create is Ops.CreateOrUpdateAsync<ParentResource>;`  |
| CreateOrReplaceSync  | Create or replace a connection (sync)                 | `create is Ops.CreateOrReplaceSync<ParentResource>;`  |
| CreateOrReplaceAsync | Create or replace a connection (async)                | `create is Ops.CreateOrReplaceAsync<ParentResource>;` |
| CustomPatchAsync     | Update a connection with custom PATCH payload (async) | `update is Ops.CustomPatchAsync<ParentResource>;`     |
| CustomPatchSync      | Update a connection with custom PATCH payload (sync)  | `update is Ops.CustomPatchSync<ParentResource>;`      |
| DeleteAsync          | Delete a connection (async)                           | `delete is Ops.DeleteAsync<ParentResource>;`          |
| DeleteSync           | Delete a connection (sync)                            | `delete is Ops.DeleteSync<ParentResource>;`           |
| ListByParent         | List connections for a parent resource                | `list is Ops.ListByParent<ParentResource>;`           |

## Complete Example

The following example shows a complete service with private endpoint connection support:

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
  `2021-10-01-preview`,
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

// 1. Define the private endpoint connection resource model
model PrivateEndpointConnection is PrivateEndpointConnectionResource;

// 2. Create the operations alias
alias PrivateEndpointOps = PrivateEndpoints<PrivateEndpointConnection>;

// 3. Add operations to the resource interface
@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
  delete is ArmResourceDeleteSync<Employee>;
  listByResourceGroup is ArmResourceListByParent<Employee>;
  listBySubscription is ArmListBySubscription<Employee>;

  // Private endpoint connection operations
  getPrivateEndpointConnection is PrivateEndpointOps.Read<Employee>;
  createOrUpdatePrivateEndpointConnection is PrivateEndpointOps.CreateOrUpdateAsync<Employee>;
  updatePrivateEndpointConnection is PrivateEndpointOps.CustomPatchAsync<Employee>;
  deletePrivateEndpointConnection is PrivateEndpointOps.DeleteAsync<Employee>;
  listPrivateEndpointConnections is PrivateEndpointOps.ListByParent<Employee>;
}
```

## Using Private Endpoints with Child Resources

Private endpoint operations can also be used with child resources. You can reuse the same operations
alias across multiple resource interfaces:

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

  // Reuse the same private endpoint operations alias
  getPrivateEndpointConnection is PrivateEndpointOps.Read<Dependent>;
  createOrUpdatePrivateEndpointConnection is PrivateEndpointOps.CreateOrUpdateAsync<Dependent>;
  deletePrivateEndpointConnection is PrivateEndpointOps.DeleteAsync<Dependent>;
  listPrivateEndpointConnections is PrivateEndpointOps.ListByParent<Dependent>;
}
```
