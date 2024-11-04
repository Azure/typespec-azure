---
title: ARM Resource Operations
---

## Recommended and Required Operations

### TrackedResource

| Operation             | Recommended | Required | TypeSpec Representation                                          |
| --------------------- | ----------- | -------- | ---------------------------------------------------------------- |
| GET                   | Yes         | Yes      | `get is ArmResourceRead<Resource>;`                              |
| CreateOrUpdate (PUT)  | Yes         | Yes      | `createOrUpdate is ArmResourceCreateOrUpdateAsync<Resource>;`    |
| Tags Update (PATCH)   | No          | Yes\*    | `update is ArmResourceTagsPatchSync<Resource>;`                  |
| Full Update (PATCH)   | Yes         | No\*     | `update is ArmResourcePatchSync<Resource, ResourceProperties>;`  |
| Delete                | Yes         | Yes      | `delete is ArmResourceDeleteSync<Resource>;`                     |
| List by ResourceGroup | Yes         | Yes      | `listByResourceGroup is ArmResourceListByParent<Resource>;`      |
| List by Subscription  | Yes         | Yes      | `listBySubscription is ArmResourceListBySubscription<Resource>;` |

\* Arm requires that, at minimum, a TrackedResource can update Tags. A Full PATCH of all updateable resource properties is preferred.

### Proxy Resource

| Operation            | Recommended | Required | TypeSpec Representation                                         |
| -------------------- | ----------- | -------- | --------------------------------------------------------------- |
| GET                  | Yes         | Yes      | `get is ArmResourceRead<Resource>;`                             |
| CreateOrUpdate (PUT) | Yes         | No\*     | `createOrUpdate is ArmResourceCreateOrUpdateAsync<Resource>;`   |
| Update (PATCH)       | Yes         | No       | `update is ArmResourcePatchSync<Resource, ResourceProperties>;` |
| Delete               | Yes         | No\*     | `delete is ArmResourceDeleteSync<Resource>;`                    |
| List by Parent       | Yes         | Yes      | `listByParent is ArmResourceListByParent<Resource>;`            |

\* Note that, if a resource implements Create, it is highly recommended that it implement delete as well, and vice-versa.

## TypeSpec Operation Templates and Interface Templates

TypeSpec provide operation templates that describe the request and response of standard resource operations. A description of the options available for each resource template, and how to choose which one is described in the sections below.

### Synchronous and Asynchronous APIs

CreateOrUpdate (PUT), Update (Patch), Delete, and Action (POST) operations over a resource may

### Determining Which Resource Properties Appear in Lifecycle Operations

By default, any property that occurs in your resource model will also appear in the response to GET, PUT, PATCH, and LIST operations, and in the request for PUT and PATCH operations. This does not work for all properties. Some properties are calculated by the service and cannot be directly set by PUT or PATCH (provisioningState, modification date, etc.). Some properties can only be set when creating a resource, but always appear in responses (e.g. 'location'). Some properties can only be set when updating the resource, and appear in responses. Some properties (rarely) may be settable when updating the resource via PUT or PATCH. To allow using a common resource model, but applying these `views` of resources to determine how the resource appear in request and responses, TypeSpec provides the visibility framework. You can see a complete representation of available visibilities in the table [on Property Visibility and Other Constraints](./resource-type.md#property-visibility-and-other-constraints). The sections below outline some common scenarios for designing properties with your operations in mind.

#### Properties That Are Never Directly Set by the User

It is common to have properties that are calculated by the service or otherwise not directly set by the user, examples include timestamps, dates, values that are only set by specific actions (on/off, enabled/disabled, provisioningState). You want to make sure that these properties are marked so that they will appear in responses and not requests. this is done using the `@visibility("read")` decorator instance:

```typespec
@visibility("read")
provisioningState: ProvisioningState;
```

### Resource Get Operations

Get is the operation to retrieve a single resource TypeSpec provides a single operation template for GET:

```typespec
get is ArmResourceRead<MyResource>;
```

- **get**: The name of the operation passed on to clients.
- **Resource**: A reference to your resource type.

### Resource CreateOrUpdate Operations (PUT)

The CreateOrUpdate operation may be synchronous (The operation may always complete before a response is returned) or asynchronous (an initial response may be returned before the operation fully completes).

- Simple resources may have synchronous PUT operations. If a resource may need to perform additional checks, creation of other dependent resources, or the like, it is best to use an Asynchronous API.
- Asynchronous operations for PUT occur when the RP needs to perform additional validaton actions, create other resources, or perform other tasks as part of resource creation or update that can cause the operation to take longer than the length of a single request/response.

| Operation        | TypeSpec                                                          |
| ---------------- | ----------------------------------------------------------------- |
| Synchronous PUT  | `createOrUpdate is ArmResourceCreateOrReplaceSync<ResourceType>`  |
| Asynchronous PUT | `createOrUpdate is ArmResourceCreateOrReplaceAsync<ResourceType>` |

In the TypeSpec in the table `createOrUpdate` is the name of the operation, which will be passed on to clients, and `ResourceType` is the type of the resource being created (or updated)

### Resource Update Operations (PATCH)

ARM Requires that all `Tracked` resources implement PATCH for ARM tags, which are contained in the envelope of every `TrackedResource`. ARM recommends that you also allow PATCH of other envelope properties and resource-specific properties. Unless marked with a specific visibility, any property in your rp-specific properties will be automatically included in the PATCH schema.

TypeSpec Provides both Synchronous and Asynchronous PATCH Operations, and allows you to specify a PATCH for Resource tags only, a PATCH for all updateable properties, or a custom patch. Generally, you should choose the patch for all updateable properties, unless you have a very good reason fro choosing another PATCH operation.

| Operation Description             | TypeSpec                                                            |
| --------------------------------- | ------------------------------------------------------------------- |
| Sync Updateable Properties PATCH  | `update is ArmResourcePatchSync<ResourceType, ResourceProperties>`  |
| Async Updateable Properties PATCH | `update is ArmResourcePatchAsync<ResourceType, ResourceProperties>` |
| Sync TagsOnly PATCH               | `update is ArmTagsPatchSync<ResourceType>`                          |
| Async TagsOnly PATCH              | `update is ArmTagsPatchAsync<ResourceType>`                         |
| Sync Custom PATCH                 | `update is ArmCustomPatchSync<ResourceType, PatchRequest>`          |
| Async Custom PATCH                | `update is ArmCustomPatchAsync<ResourceType, PatchRequest>`         |

The ArmResourcePatch\* templates take the resource type and the resource properties type as parameters.
The ArmTagsPatch\* templates take the resource type as a parameter.
The ArmCustomPatch\* templates take the resource type and your custom PATCH request type as parameters.

### Resource Delete Operations (DELETE)

The Delete operation may be synchronous (The operation may always complete before a response is returned) or asynchronous (an initial response may be returned before the operation fully completes).

Simple resources may have synchronous DELETE operations. If a resource needs to clean up other resources or do other validations as part of delete, the delete operation may need to be asynchronous.

| Operation           | TypeSpec                                                  |
| ------------------- | --------------------------------------------------------- |
| Synchronous Delete  | `delete is ArmResourceDeleteSync<ResourceType>`           |
| Asynchronous Delete | `delete is ArmResourceDeleteWithoutOkAsync<ResourceType>` |

In the TypeSpec in the table `delete` is the name of the operation, which will be passed on to clients, and `ResourceType` is the type of the resource being deleted.

### Resource List Operations (GET)

Arm Resource list operations return a list of Tracked or Proxy Resources at a particular scope.

- All resources _should_ include a list operation at its immediate parent scope
  - For **Tenant Resources**, this is at the tenant scope
  - For **Extension Resources**, this is at the scope of resources they are extending
  - For **Tracked Resources**, this is at the resource group scope.
  - For **Child Resources**, this is at the scope of the resource parent.
- Tracked resources _must_ include a list operation at the Subscription level.

| Operation          | TypeSpec                                                            |
| ------------------ | ------------------------------------------------------------------- |
| ListByParent       | `listByWidget is ArmResourceListByParent<ResourceType>`             |
| ListBySubscription | `listBySubscription is ArmResourceListBySubscription<ResourceType>` |

### Resource Actions (POST)

Custom actions define any operations over resources outside the simple CRUDL (Create< Read, Update, Delete, List) or lifecycle operations described above. Any operation that returns data that is not made up of resources, performs a prescriptive state change on the resource (cycling power, upgrading, etc.), or any operation that does not fit into the operations described above should be modelled as a _resource action_. Examples of resource actions include:

- Operations that manage credentials associated with a resource
- Operations that calculate statistics about resources
- Operations that make specific state changes to resources (power cycle, upgrade, etc.)

#### Actions that take input and output

Operations that manage credentials are a good example fo this category. TypeSpec defines synchronous and asynchronous templates for actions that consume and produce information.

| Operation                    | TypeSpec                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------ |
| Synchronous Resource Action  | `updateCredentials is ArmResourceActionSync<ResourceType, Request, Response>`  |
| Asynchronous Resource Action | `updateCredentials is ArmResourceActionAsync<ResourceType, Request, Response>` |

Parameters to the template are the ResourceType, the model for the operation Request body, and the model for the operation Response body.

#### Actions that take input but produce no output (state changing actions)

Operations that make state changes will often take some user configuration, and will return a seccess code or an error code depending on success or failure. TypeSpec defines synchronous and asynchronous operation templates for state changing actions.

| Operation                     | TypeSpec                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| Synchronous NoContent Action  | `updateCredentials is ArmResourceActionNoContentSync<ResourceType, Request>`          |
| Asynchronous NoContent Action | `updateCredentials is ArmResourceActionNoResponseContentAsync<ResourceType, Request>` |

Parameters to the template are the ResourceType and the model for the operation Request body.

### Actions that take no input but produce output (data retrieval actions)

Some operations return data or paged lists of data. TypeSpec does not yet provide templates for these kinds of actions, but here are two templates that you could reuse in your own specification, described in the next section of the document:

- [Synchronous Resource List Actions](#synchronous-list-action)
- [Asynchronous List Action](#asynchronous-list-action)

### Check Name Operations

Some services provide operations to check name availability, either location-specific (locally) or globally, especially if a resource name must be globally unique (such as when an exposed endpoint uses the resource name in the url).

| Operation                      | TypeSpec                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Global Name Availability Check | `checkGlobalName is checkGlobalNameAvailability<TRequest, TResponse, TAdditionalParams>`             |
| Local Name Availability Check  | `checkLocalName is checkLocalNameAvailability<TRequest, TResponse, TAdditionalParams>`               |
| Custom Name Availability Check | `customNameCheck is checkNameAvailability<TScopeParameters, TRequest, TResponse, TAdditionalParams>` |

`checkGlobalNameAvailability` and `checkLocalNameAvailability` have default values that allow them to be used without specifying any template parameters. `checkNameAvailability` requires the `TScopeParameters` template parameter, which describes the parameters which define the scope of the name check request. For reference, the following table shows the `TScopeParameters` for the standard templates:

| Operation                      | Scope Parameters                                                       |
| ------------------------------ | ---------------------------------------------------------------------- |
| Global Name Availability Check | `SubscriptionIdParameter, DefaultProviderNamespace`                    |
| Local Name Availability Check  | `SubscriptionIdParameter, DefaultProviderNamespace, LocationParameter` |

## Writing Custom Operations

TypeSpec operation templates provide a simple mechanism for producing the most common operation patterns in ARM, using best practices and conforming to ARM RPC guidelines. However, sometimes a service has special requirements for operations that fall outside these boundaries. The `Azure.ResourceManager.Foundations` namespace provides lower level building blocks that can be used to produce operations and operation templates.

The building blocks are described in the sections below:

### ARM Response Types

Custom operations in ARM still need to respect the correct response schema. This library provides standard ARM response types to help with reusability and compliance.

| Model                               | Code | Description                                   |
| ----------------------------------- | ---- | --------------------------------------------- |
| `ArmResponse<T>`                    | 200  | Base Arm 200 response.                        |
| `ArmResourceUpdatedResponse<T>`     | 200  | Resource updated (PUT) response.              |
| `ArmResourceCreatedResponse<T>`     | 201  | Resource created response for an lro.         |
| `ArmResourceCreatedSyncResponse<T>` | 201  | Resource created synchronously.               |
| `ArmAcceptedResponse`               | 202  | Base Arm Accepted response.                   |
| `ArmNoContentResponse`              | 204  | Base Arm No Content response.                 |
| `ArmDeletedResponse`                | 200  | Resource deleted response.                    |
| `ArmDeleteAcceptedResponse`         | 202  | Resource deletion in progress response.       |
| `ResourceListResult<T>`             | 200  | Return a list of resource with ARM pagination |
| `ErrorResponse`                     | x    | Error response                                |

### Common Operation Parameters

There are a number of model types which specify common parameters which are used in resource type operations:

| Model                           | In           | Description                                                 |
| ------------------------------- | ------------ | ----------------------------------------------------------- |
| `ApiVersionParameter`           | query        | api-version parameter                                       |
| `SubscriptionIdParameter`       | path         | Subscription ID path parameter                              |
| `ResourceGroupNameParameter`    | path         | Resource Group Name path parameter                          |
| `ResourceInstanceParameters<T>` | path & query | Identity parameters for a resource, with api-version        |
| `ResourceParentParameters<T>`   | path & query | Identity Parameters for listing by parent, with api-version |
| `ResourceUriParameter`          | path         | Resource uri path parameter for Extension resources         |
| `OperationIdParameter`          | path         | Operation Id path parameter                                 |

### Synchronous List Action

Here is a sample template for resource list actions that return synchronously, using the common building blocks.

```typespec
// Template definition
@autoRoute
@armResourceAction(TResource)
@post
op ArmResourceListActionSync<TResource extends ArmResource, TResponse extends object>(
  ...ResourceInstanceParameters<TResource, TBaseParameters>,
): ArmResponse<TResponse> | ErrorResponse;

// Usage

// The model for each data record
model Widget {
  name: string;
  color: string;
}
@armResourceOperations(MyResource)
interface MyResourceOperations {
  // ResourceListResult<T> produces a Pageable list of T
  listWidgets is ArmResourceListActionSync<MyResource, ResourceListResult<Widget>>;
}
```

### Asynchronous List Action

Here is a sample template for resource list actions that return asynchronously, using the common building blocks.

```typespec
// Template definition
@autoRoute
@armResourceAction(TResource)
@post
op ArmResourceListActionAsync<TResource extends ArmResource, TResponse extends object>(
  ...ResourceInstanceParameters<TResource, TBaseParameters>,
): ArmResponse<TResponse> | ArmAcceptedResponse | ErrorResponse;

// Usage

// The model for each data record
model Widget {
  name: string;
  color: string;
}
@armResourceOperations(MyResource)
interface MyResourceOperations {
  // ResourceListResult<T> produces a Pageable list of T
  listWidgets is ArmResourceListActionAsync<MyResource, ResourceListResult<Widget>>;
}
```
