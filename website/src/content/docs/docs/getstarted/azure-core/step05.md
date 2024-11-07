---
title: 5. Defining standard resource operations
---

The `Azure.Core` namespace provides a variety of [standard lifecycle operations](https://azure.github.io/typespec-azure/docs/libraries/azure-core/reference/interfaces#Azure.Core.ResourceOperations) for resource types. These operations adhere to the requirements of the [Azure REST API Guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md).

## Operation interface definition

To define standard operations for a resource type, create an instance of the `ResourceOperations` interface that is tailored to your service. Here's an example:

```typespec
import "@azure-tools/typespec-azure-core";

using Azure.Core;
using Azure.Core.Traits;

alias ServiceTraits = SupportsRepeatableRequests &
  SupportsConditionalRequests &
  SupportsClientRequestId;

alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;
```

In this example:

1. `ServiceTraits` is defined as the intersection of three trait model types available in `Azure.Core`. Learn more about interface-level service traits [here](https://azure.github.io/typespec-azure/docs/libraries/azure-core/reference/data-types).
2. `Operations` is defined as the instantiation of `Azure.Core.ResourceOperations` with the service trait types you defined.

> **Note:** The name `Operations` is used for convenience, but you might define multiple aliases of `ResourceOperation` for a single service to apply different customizations for some operations. You might choose a more explicit name like `StandardOperations`.

Next, we'll use this interface alias to define the standard resource operations we need.

## Resource operations definition

We'll define the standard set of CRUD (Create, Read, Update, Delete) operations typically needed for a resource type in an Azure service. We'll do this by defining an interface called `Widgets`:

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

> **Note:** It's not necessary to define your resource operations inside of an `interface`. You can also define them in a sub-namespace of your service or inside the top-level namespace of the service. However, it's a best practice in TypeSpec to use `interface` to encapsulate the operations of a particular resource type.

The `Widget` interface defines the following standard lifecycle operations:

- `ResourceRead<TResource>`: Defines a "read" operation for a single resource instance.
- `ResourceCreateOrUpdate<TResource>`: Defines an "upsert" operation which either creates or updates an instance of the resource type depending on whether it already exists.
- `ResourceDelete<TResource>`: Defines a "delete" operation to delete a specific instance of the resource.
- `ResourceList<TResource>`: Defines an operation that lists all instances of the resource type.

> **Note:** There are both instantaneous and long-running versions of "create", "update", and "delete" operations for resource types depending on what you need for a particular resource!

These operations will all exist under the route path `/widgets/{widgetName}`, with the list operation generating the path `/widgets`.

## Error response customization

If your service needs to use a custom error response type for all resource operations (which is uncommon), you may pass in a custom error response type to the `ResourceOperations` interface:

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
