# 5. Defining standard resource operations

The `Azure.Core` namespace provides a number of [standard lifecycle operations](https://azure.github.io/typespec-azure/docs/libraries/azure-core/reference/interfaces#Azure.Core.ResourceOperations) for resource types which encode many of the requirements of the [Azure REST API Guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md).

## Defining the Operation Interface

The first step to defining standard operations for a resource type is to create an instance of the `ResourceOperations` interface that is tailored to the service you are describing. Here is a canonical example:

```typespec
import "@azure-tools/typespec-azure-core";

using Azure.Core;
using Azure.Core.Traits;

alias ServiceTraits = SupportsRepeatableRequests &
  SupportsConditionalRequests &
  SupportsClientRequestId;

alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;
```

There are two things happening here:

1. We define an alias called `ServiceTraits` which is defined as the intersection of three trait model types. You can learn more about interface-level service traits [here](https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step09#applying-traits-to-all-resource-operations).
2. Then, define an alias called `Operations` which is defined as the instantiation of `Azure.Core.ResourceOperations` with the trait type you defined.

> **NOTE:** We use the name `Operations` here as a convenience, but it is possible that you will define multiple aliases of `ResourceOperation` for a single service to apply different customizations for some operations. You might choose to name it something more explicit like `StandardOperations`.

We will now use this interface alias to define the standard resource operations we need.

## Defining Resource Operations

Let's define the standard set of CRUD (Create, Read, Update, Delete) operations that are typically needed for a resource type in an Azure service.

We will do that by defining an interface called `Widgets` which reaches into the `Operations` interface to use the standard resource operation shapes that it contains:

```typespec
interface Widgets {
  @doc("Fetch a Widget by name.")
  getWidget is Operations.ResourceRead<Widget>;

  @doc("Creates or updates a Widget.")
  createOrUpdateWidget is Operations.ResourceCreateOrUpdate<Widget>;

  @doc("Delete a Widget.")
  deleteWidget is Operations.ResourceDelete<Widget>;

  @doc("List Widget resources.")
  listWidgets is Operations.ResourceList<Widget>;
}
```

> **NOTE:** It is not necessary to define your resource operations inside of an `interface`. You can also define them in a sub-namespace of your service or inside the top-level namespace of the service. However, it is a best practice in TypeSpec to use `interface` to encapsulate the operations of a particular resource type.

The `Widget` interface defines the following standard lifecycle operations:

- `ResourceRead<TResource>` - defines a "read" operation for a single resource instance
- `ResourceCreateOrUpdate<TResource>` - defines an "upsert" operation which either creates or updates an instance of the resource type depending on whether it already exists
- `ResourceDelete<TResource>` - defines a "delete" operation to delete a specific instance of the resource
- `ResourceList<TResource>` - defines an operation that lists all instances of the resource type

> **NOTE:** There are both instantaneous and long-running versions of "create", "update", and "delete" operations for resource types depending on what you need for a particular resource!

Based on the configuration of the `Widget` type and the use of these standard operation templates, these operations will all exist under the route path:

```
/widgets/{widgetName}
```

The list operation will simply generate the path `/widgets`.

## Customizing the Error Response

If your service needs to use a custom error response type for all resource operations (this is uncommon), you may pass in a custom error response type to the `ResourceOperations` interface:

```typespec
import "@azure-tools/typespec-azure-core";

using Azure.Core;
using Azure.Core.Traits;

alias ServiceTraits = SupportsRepeatableRequests &
  SupportsConditionalRequests &
  SupportsClientRequestId;

@error
@doc("A custom error response type.")
model ErrorResponse {
  @doc("The error code.")
  code: string;

  @doc("The error message.")
  message: string;
}

alias Operations = Azure.Core.ResourceOperations<ServiceTraits, ErrorResponse>;
```

You can also reuse the standard Azure Core error types with minor customizations:

```typespec
import "@azure-tools/typespec-azure-core";

using Azure.Core;
using Azure.Core.Traits;

alias ServiceTraits = SupportsRepeatableRequests &
  SupportsConditionalRequests &
  SupportsClientRequestId;

@doc("A custom error type.")
model Error is Azure.Core.Foundations.Error {
  @doc("The environment where the error occurred.")
  environment: string;
}

alias Operations = Azure.Core.ResourceOperations<
  ServiceTraits,
  Azure.Core.Foundations.ErrorResponseBase<Error>
>;
```
