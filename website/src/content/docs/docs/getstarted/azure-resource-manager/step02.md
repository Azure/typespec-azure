---
title: 3. Defining the Resources
---

An ARM resource provider is composed of resources. The TypeSpec Azure Resource Manager library makes it much easier to define the structure and endpoints of such resources.

There are three essential components of a resource defined with TypeSpec:

- A model type representing the resource, derived from one of the [base resource types](#base-resource-types)
- A model type defining the properties of the resource type
- An interface that defines the operations that can be performed on the resource type, usually a combination of [recommended and required Operations](../../howtos/ARM/resource-operations.md#recommended-and-required-operations) and [resource actions](../../howtos/ARM/resource-operations.md#resource-actions-post)

> Read the [TypeSpec tutorial](https://github.com/Microsoft/typespec/blob/main/docs/tutorial.md) to learn the basics about TypeSpec model types and interfaces.

## 1. **Define a model representing the `properties` of the ARM resource**

Each resource type must have a properties type which defines its custom properties. This type will be exposed as the `properties` property of the resource type.

```typespec
@doc("The properties of User")
model UserProperties {
  @doc("The user's full name")
  fullName: string;

  @doc("The user's email address.")
  emailAddress: string;
}
```

## 2. **Define a model representing the resource type**

Resource types are defined as plain models which pull in a standard resource type using the `is` keyword.

You define a resource type, you need the following:

- A property model type which defines the resource type's custom properties as we described in step 1
- A `name` parameter definition. You should use `ResourceNameParameter` model which automatically populate the following decorators with camel cased name for `@key` and pluralized name for `@segment` as values. You can override these values via `ResourceNameParameter`'s optional template parameter.
  - `@key`: Specifies the parameter name for this resource type in the service URI hierarchy
  - `@segment`: Specifies the name of the resource "collection", the URI segment that comes just before the parameter name which identifies the resource type

Here we define a tracked resource called `User`:

```typespec
@doc("A User Resource")
model User is TrackedResource<UserProperties> {
  ...ResourceNameParameter<User>;
}
```

## 3. **Define an interface with operations for the resource type**

```typespec
@armResourceOperations
interface Users {
  get is ArmResourceRead<User>;
  create is ArmResourceCreateOrReplaceAsync<User>;
  update is ArmResourcePatchSync<User, UserProperties>;
  delete is ArmResourceDeleteSync<User>;
  listByResourceGroup is ArmResourceListByParent<User>;
  listBySubscription is ArmListBySubscription<User>;
}
```

This uses operation templates defined in the `Azure.ResourceManager` namespace to define the operations over your resource. For operations like `create (PUT)`, `update (PATCH)` and `delete (DELETE)` there are both asynchronous (long-running) and synchronous (operation completes in the same http request) versions of the operation templates.

The interface above creates the following operations for your service:

| Method & Path                                                                                                        | Description                     |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `GET /subscriptions/{subscriptionId}/providers/Contoso.Users/users`                                                  | list all User by subscription   |
| `GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Contoso.Users/users`               | list all User by resource group |
| `GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Contoso.Users/users/{userName}`    | get item                        |
| `PUT /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Contoso.Users/users/{userName}`    | create item                     |
| `PATCH /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Contoso.Users/users/{userName}`  | patch item                      |
| `DELETE /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Contoso.Users/users/{userName}` | delete item                     |

### Alternate (Legacy) Syntax for Operations

Alternately, you can use interface templates, which define a set of operations in your resource operations interface. Interface templates are convenient if you want to conform to standard
practices, but are less flexible than operation templates.

To specify the standard set of TrackedResource operations for your resource, you can use the following code:

```typespec
@armResourceOperations
interface Users extends TrackedResourceOperations<User, UserProperties> {}
```

This will now produce all the endpoints(`get`, `post`, `put`, `patch` and `delete`, listByResourceGroup, listBySubscription) for a resource called `Users` and the `operations` endpoint for the service:

| Method & Path                                                                                                        | Description                          |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `GET /providers/Contoso.Users/operations`                                                                            | List all operations for your service |
| `GET /subscriptions/{subscriptionId}/providers/Contoso.Users/users`                                                  | list all User by subscription        |
| `GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Contoso.Users/users`               | list all User by resource group      |
| `GET /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Contoso.Users/users/{userName}`    | get item                             |
| `PUT /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Contoso.Users/users/{userName}`    | insert item                          |
| `PATCH /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Contoso.Users/users/{userName}`  | patch item                           |
| `DELETE /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Contoso.Users/users/{userName}` | delete item                          |

#### Base Resource Types

Here are the base resource types you can use when defining your own ARM resources:

| Name                             | Description                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| `TrackedResource<TProperties>`   | Defines a normal ARM resource where `TProperties` is the model of the `properties`     |
| `ProxyResource<TProperties>`     | Defines a proxy ARM resource where `TProperties` is the model of the `properties`      |
| `ExtensionResource<TProperties>` | Defines an extension ARM resource where `TProperties` is the model of the `properties` |
