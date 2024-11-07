---
title: 9. Customizing operations with traits
---

For all standard lifecycle operations you can customize the operation parameters and response body by passing a special model type to the `Traits` parameter of the operation template, typically the second parameter of the operation template. You can also customize the whole set of resource operations by passing traits to the `ResourceOperations` interface.

You can combine multiple traits using the model intersection operator `&`. Here's an example of defining the `ServiceTraits` with `SupportsRepeatableRequests`, `SupportsConditionalRequests` and `SupportsClientRequestId`. These are then passed into the `Azure.Core.ResourceOperations` template:

```typespec
import "@azure-tools/typespec-azure-core";

using Azure.Core;
using Azure.Core.Traits;

alias ServiceTraits = SupportsRepeatableRequests &
  SupportsConditionalRequests &
  SupportsClientRequestId;

alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;
```

Traits can be applied simultaneously at both the interface and operation level, they will be composed together when your operation is defined.

For example, if you wanted to add standard list operation query parameters to the `listWidgets` operation, you could use the `ListQueryParametersTrait`:

```typespec
@doc("List Widget resources")
op listWidgets is Operations.ResourceList<
  Widget,
  ListQueryParametersTrait<StandardListQueryParameters & SelectQueryParameter>
>;
```

## Useful trait types

The following trait types can be used for typical operation customization patterns:

### `QueryParametersTrait<TParams, Contexts>`

This trait adds query parameters to operation signatures. It accepts a model type containing the query parameters that will be mixed in to the operation signature:

```typespec
op getWidget is Operations.ResourceRead<
  Widget,
  QueryParametersTrait<{
    @query foo: string;
  }>
>;
```

> **NOTE**: All properties in `TParams` must be marked with `@query` or an error will be raised.

The `Contexts` parameter is configured to apply the query parameters to all operations by default.

To constrain the types of operations that these query parameters will apply to, pass one ore more of the following values:

- **TraitContext.Read**: Applies to read operations
- **TraitContext.Create**: Applies to create operations
- **TraitContext.Update**: Applies to update operations
- **TraitContext.Delete**: Applies to delete operations
- **TraitContext.List**: Applies to list operations
- **TraitContext.Action**: Applies to custom action operations

Here is an example of applying query parameters to `Read` and `List` operations:

```typespec
alias MyQueryParams = QueryParametersTrait<
  {
    @query foo: string;
  },
  TraitContext.Read | TraitContext.List
>;

// This will have a `foo` parameter added
op getWidget is Operations.ResourceRead<Widget, MyQueryParams>;

// This will not get the `foo` parameter because it doesn't match the contexts
op deleteWidget is Operations.ResourceDelete<
  Widget,
  QueryParametersTrait<{
    @query foo: string;
  }>
>;
```

### `ListQueryParametersTrait<TParams>`

This is a helper trait that specialized `QueryParametersTrait` to the `TraitContext.List` context. For example:

```typespec
alias MyListQueryParams = ListQueryParametersTrait<{
  @query foo: string;
}>;

// Will get the `foo` parameter
op listWidgets is Operations.ResourceList<Widget, MyListQueryParams>;

// Will not get the `foo` parameter
op deleteWidget is Operations.ResourceDelete<Widget, MyListQueryParams>;
```

### `RequestHeadersTrait<TParams, Contexts>`

This trait adds request headers to operation signatures. It accepts a model type containing the request headers that will be mixed in to the operation signature:

```typespec
op getWidget is ResourceRead<
  Widget,
  RequestHeadersTrait<{
    @header foo: string;
  }>
>;
```

> **NOTE**: All properties in `TParams` must be marked with `@header` or an error will be raised.

You can specify `Contexts` where this trait applies in the way as described for the `QueryParametersTrait`.

### `ResponseHeadersTrait<TParams, Contexts>`

This trait adds response headers to operation signatures. It accepts a model type containing the response headers that will be mixed in to the operation signature:

```typespec
op getWidget is ResourceRead<
  Widget,
  ResponseHeadersTrait<{
    @header foo: string;
  }>
>;
```

> **NOTE**: All properties in `TParams` must be marked with `@header` or an error will be raised.

You can specify `Contexts` where this trait applies in the way as described for the `QueryParametersTrait`.

## Applying traits to all resource operations

If you would like to apply the same traits to all resource operations, you can do so by adding them to the traits object for your instance of the `ResourceOperations` interface. Here's an example of adding a request header called `foo` to all resource operations:

```typespec
import "@azure-tools/typespec-azure-core";

using Azure.Core;
using Azure.Core.Traits;

alias ServiceTraits = SupportsRepeatableRequests &
  SupportsConditionalRequests &
  SupportsClientRequestId &
  RequestHeadersTrait<{
    @header foo: string;
  }>;

alias Operations = ResourceOperations<ServiceTraits>;

op deleteWidget is Operations.ResourceDelete<Widget>;
```

This defines `deleteWidget` by using the `ResourceDelete` template defined inside of your customized `Operations` interface.

**IMPORTANT NOTE:** The `ResourceOperations` interface requires that an explicit set of traits be included to describe whether certain Azure service features are supported.

Here is the list of the required traits with the names of the trait models to enable and disable those features:

- **RepeatableRequests**: `SupportsRepeatableRequests` and `NoRepeatableRequests`
- **ConditionalRequests**: `SupportsConditionalRequests` and `NoConditionalRequests`
- **ClientRequestId**: `SupportsClientRequestId` and `NoClientRequestId`

## Customizing the API version parameter

You can use the `VersionParameterTrait` to customize the API version parameter for resource operations, either at the level of interface or individual operation. To do this, use the `TraitOverride` type to override the existing `api-version` query parameter:

```typespec
@doc("The ApiVersion path parameter.")
model ApiVersionPathParameter {
  @segment("api")
  @path("api-version")
  @doc("The API version to use for this operation.")
  apiVersion: string;
}

op deleteWidget is ResourceDelete<
  Widget,
  TraitOverride<VersionParameterTrait<ApiVersionPathParameter>>
>;
```

Using the `TraitOverride` modifier with the `VersionParameterTrait<ApiVersionPathParameter>` causes any existing `VersionParameterTrait` instances in the operation signature to be overridden by the one you have supplied.

This will result in an operation that has the route path `/api/{apiVersion}/widgets/{widgetName}` while also removing the old `api-version` query parameter from the operation signature.

## Versioning the use of traits

It is possible that a service will begin to support a particular feature or trait in a later version. There are two ways to express that a trait is being added in a later service version:

### Using the `TVersionAdded` parameter of some trait types

> **NOTE:** Versioning of Azure Core service specifications is covered in more detail on [this page](https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step10).

Some standard trait types accept an optional `TVersionAdded` parameter which enables you to specify the service version enum representing the version where support for this trait is added:

- `SupportsClientRequestId`
- `SupportsRepeatableRequests`
- `SupportsConditionalRequests`

Here is an example of adding support for repeatable requests in a later service version:

```typespec
import "@azure-tools/typespec-azure-core";

using Azure.Core;
using Azure.Core.Traits;
using TypeSpec.Versioning;

@service({
  title: "Contoso Widget Manager",
})
@versioned(Contoso.WidgetManager.Versions)
namespace Contoso.WidgetManager;

enum Versions {
  @useDependency(Azure.Core.Versions.v1_0_Preview_2)
  v2022_08_31: "v20220831",

  @useDependency(Azure.Core.Versions.v1_0_Preview_2)
  v2022_11_30: "v20221130",
}

alias ServiceTraits = SupportsRepeatableRequests<Versions.v2022_11_30> &
  SupportsConditionalRequests &
  SupportsClientRequestId;

alias Operations = ResourceOperations<ServiceTraits>;
```

### Define a custom trait and add the `@traitAdded` decorator

Building on the previous example, we can add a custom header trait at a later service version using the `@traitAdded` decorator:

```typespec
@doc("A custom trait added at a later service version.")
@traitAdded(Versions.v2022_11_30)
model CustomRequestHeadersTrait
  is RequestHeadersTrait<{
    @TypeSpec.Http.header foo: string;
  }>;

alias ServiceTraits = SupportsRepeatableRequests<Versions.v2022_11_30> &
  SupportsConditionalRequests &
  SupportsClientRequestId &
  CustomRequestHeadersTrait;

alias Operations = ResourceOperations<ServiceTraits>;
```
