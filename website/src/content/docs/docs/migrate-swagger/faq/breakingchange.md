---
title: Resolving Swagger Breaking Change Violations
---

The Swagger Converter cannot perfectly represent every aspect of every API in TypeSpec. This document outlines common changes you may need to make to a converted TypeSpec to ensure compatibility with your existing service API and to pass check-in validations.

## Migrating ARM Specifications

### Customizing Route for Action (POST) Operations

By default, the last segment of a POST action operation route is the operation name. For example:

```tsp
move is ArmResourceActionSync<Employee, MoveRequest, MoveResponse>;
```

This produces the route:  
`/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}/move`

To customize the action segment, use the `@action` decorator:

```tsp
@action("customizedAction")
move is ArmResourceActionSync<Employee, MoveRequest, MoveResponse>;
```

This produces the route:  
`/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}/customizedAction`

### Customizing Request Payload Parameter Names

For operations with request bodies (PUT, POST, PATCH), TypeSpec operation templates provide default names for request parameters. You can use augment decorators to customize these parameter names and other parts of the operation signature.

The following sections show how to do this for each operation template.

#### CreateOrUpdate (PUT) APIs

Given a PUT operation, for example:

```tsp
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
}
```

The name of the request body parameter is `resource`. You can change the name in clients using an augment decorator:

```tsp
@@clientName(Widgets.createOrUpdate::parameters.resource, "<desired-request-body-parameter-name>");
```

This works for any PUT operation template.

#### Update (PATCH) APIs

Given a PATCH operation, for example:

```tsp
interface Widgets {
  update is ArmResourcePatchAsync<Widget, WidgetProperties>;
}
```

The name of the request body parameter is `properties`. You can change the name in clients using an augment decorator:

```tsp
@@clientName(Widgets.update::parameters.properties, "<desired-request-body-parameter-name>");
```

This works for any PATCH operation template.

#### Action (POST) APIs

Given a POST operation, for example:

```tsp
interface Widgets {
  mungeWidget is ArmResourceActionAsync<Widget, MungeRequest, MungeResponse>;
}
```

The name of the request body parameter is `body`. You can change the name in clients using an augment decorator:

```tsp
@@clientName(Widgets.mungeWidget::parameters.body, "<desired-request-body-parameter-name>");
```

This works for any POST operation template.

### Adding Request Query or Header Parameters

The `Parameters` template parameter allows you to specify additional parameters after the operation path (for example, query and header parameters) in the form of a model, with each model property corresponding to a parameter. You may use intersection to combine multiple separate parameters.

```tsp
// All list query params
op listBySubscription is ArmListBySubscription<
  Widget,
  Parameters = Azure.Core.StandardListQueryParameters
>;

// Intersecting individual parameters
op listBySubscription is ArmListBySubscription<
  Widget,
  Parameters = Azure.Core.TopQueryParameter & Azure.Core.SkipQueryParameter
>;
```

### Changing Response Types

The `Response` parameter allows you to specify non-error responses to the operation.

```tsp
op listBySubscription is ArmListBySubscription<Widget, Response = MyCustomCollectionType>;
```

### Changing Error Types

The `Error` parameter allows you to change the default error type used in an operation.

```tsp
op listBySubscription is ArmListBySubscription<Widget, Error = MyCustomError>;
```

### Converting Synchronous Operations to LROs

You can generally choose an asynchronous operation template that matches your operation.

#### Templates for Async PUT Operations

- `ArmCreateOrReplaceAsync` is a PUT operation that uses the 'resource' definition in the request body, and returns a `200` response and a `201` response, both of which contain the created/updated resource in the response payload. The 201 response contains a `Location` LRO header.

  ```tsp
  op createOrUpdate is ArmCreateOrReplaceAsync<Resource>;
  ```

- `ArmCreateOrUpdateAsync` is a PUT operation that uses the 'resource' definition in the request body, and returns a `200` response and a `201` response, both of which contain the created/updated resource in the response payload. The 201 response contains an `Azure-AsyncOperation` LRO header.

  ```tsp
  op createOrUpdate is ArmCreateOrUpdateAsync<Resource>;
  ```

#### Templates for Async PATCH Operations

- `ArmTagsPatchAsync` is a PATCH operation that only allows changing the resource tags (the minimum for Azure Resource Manager).

  ```tsp
  op update is ArmTagsPatchAsync<Resource>;
  ```

- `ArmResourcePatchAsync` is a PATCH operation that uses the visibility settings to select properties for the PATCH request body (any property with no visibility setting, or including visibility "update"). It follows the required 202 pattern to resolve the LRO via location, although this can be customized using the `LroHeaders` parameter.

  ```tsp
  op update is ArmResourcePatchAsync<Resource, ResourceProperties>;
  ```

- `ArmCustomPatchAsync` is a PATCH operation that allows you to customize the PATCH request body.

  ```tsp
  op update is ArmCustomPatchAsync<Resource, PatchRequestBody>;
  ```

#### Templates for Async POST (Action) Operations

- `ArmResourceActionAsync` is a POST operation that allows you to specify the request and response body for a resource action operation. It follows the required 202 pattern to resolve the LRO via location, although this can be customized using the `LroHeaders` parameter.

  ```tsp
  op doStuff is ArmResourceActionAsync<Resource, ActionRequest, ActionResponse>;

  // With no request body
  op doStuffNoRequest is ArmResourceActionAsync<Resource, void, ActionResponse>;

  // With no response body
  op doStuffCommand is ArmResourceActionAsync<Resource, ActionRequest, void>;
  ```

#### Templates for Async DELETE Operations

- `ArmResourceDeleteWithoutOKAsync` is a DELETE operation that uses no request body, will return a `202` response in the case of an asynchronous delete operation, and a `204` response in case the resource does not exist.

  ```tsp
  op delete is ArmResourceDeleteWithoutOKAsync<Resource>;
  ```

- `ArmResourceDeleteAsync` is a DELETE operation that uses no request body, and returns a `200` response in the case of a successful synchronous delete, a `202` response in the case of an asynchronous delete operation, and a `204` response in case the resource does not exist.

  ```tsp
  op delete is ArmResourceDeleteAsync<Resource>;
  ```

### Visibility Changes for `nextLink` and `value` Properties

Some older specifications marked these values as `readOnly`. This has no impact on the API or on SDKs, you can safely ignore this difference in the spec, and any resulting braking change violation.

```tsp
@@visibility(Azure.Core.Page.value, "read");
@@visibility(Azure.Core.Page.nextLink, "read");
```
