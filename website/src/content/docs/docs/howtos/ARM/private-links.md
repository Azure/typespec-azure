---
title: Private Links
description: Adding Private Link operations to ARM resources
llmstxt: true
---

Private Link resources allow users to discover which connection types are available for a resource.
Resource providers that support private link resources must declare a private link resource type in
their provider namespace and use the standard `PrivateLinks` interface to expose operations.

## Defining a Private Link Resource

To define a private link resource, create a model in your provider namespace that extends
`PrivateLink`:

```typespec
model MyPrivateLinkResource is PrivateLink;
```

## Defining Private Link Operations

Create an alias for your private link operations using the `PrivateLinks` interface template:

```typespec
alias PrivateLinkOps = PrivateLinks<MyPrivateLinkResource>;
```

## Adding Private Link Operations to Your Resource Interface

Add private link operations to your resource interface using the operations alias:

```typespec
@armResourceOperations
interface Employees {
  // ... other resource operations ...
  getPrivateLink is PrivateLinkOps.Read<Employee>;
  listPrivateLinks is PrivateLinkOps.ListByParent<Employee>;
}
```

## Available Operations

The `PrivateLinks` interface provides the following operations:

| Operation    | Description                              | TypeSpec Representation                          |
| ------------ | ---------------------------------------- | ------------------------------------------------ |
| Read         | Get a single private link resource       | `getPrivateLink is Ops.Read<ParentResource>;`    |
| ListByParent | List private link resources for a parent | `listLinks is Ops.ListByParent<ParentResource>;` |

## Complete Example

The following example shows a complete service with private link support:

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

// 1. Define the private link resource model
model MyPrivateLinkResource is PrivateLink;

// 2. Create the operations alias
alias PrivateLinkOps = PrivateLinks<MyPrivateLinkResource>;

// 3. Add operations to the resource interface
@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
  delete is ArmResourceDeleteSync<Employee>;
  listByResourceGroup is ArmResourceListByParent<Employee>;
  listBySubscription is ArmListBySubscription<Employee>;

  // Private link operations
  getPrivateLink is PrivateLinkOps.Read<Employee>;
  listPrivateLinks is PrivateLinkOps.ListByParent<Employee>;
}
```

## Using Private Links with Child Resources

Private link operations can also be used with child resources. You can reuse the same operations
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

  // Reuse the same private link operations alias
  getPrivateLink is PrivateLinkOps.Read<Dependent>;
  listPrivateLinks is PrivateLinkOps.ListByParent<Dependent>;
}
```
