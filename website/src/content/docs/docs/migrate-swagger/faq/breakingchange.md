---
title: Resolving Swagger Breaking Change Violations
---

The Swagger Converter will not be able to accurately represent every part of every API in TypeSpec. This document
outlines some common changes you might need to make to a converted TypeSpec to make it conform to your existing service API and  
pass check-in validations.

## Migrate ARM Specs

### Changing the Names of Request Payload Parameters

For operations with non-empty request bodies (PUT, POST, PATCH), the TypeSpec operation templates provide a default name for the
request parameter corresponding to the request payload. You can use augment decorators to make changes to this parameter, and other parts of the operation signature.

The following sections show how to do this for each operation template.

#### CreateOrUpdate (PUT) APIs

Given a PUT operation, for example:

```tsp
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
}
```

The name of the request body parameter is `resource` so you can change the name in clients using an augment decorator

```tsp
@@clientName(Widgets.createOrUpdate::parameters.resource, "<desired-request-body-parameter-name>");
```

Note that this works for _any_ PUT operation template.

#### Update (PATCH) APIs

Given a PATCH operation, for example:

```tsp
interface Widgets {
  update is ArmResourcePatchAsync<Widget, WidgetProperties>;
}
```

The name of the request body parameter is `properties` so you can change the name in clients using an augment decorator

```tsp
@@clientName(Widgets.update::parameters.properties, "<desired-request-body-parameter-name>");
```

Note that this works for _any_ PATCH operation template.

### Action (POST) APIs

Given a POST operation, for example:

```tsp
interface Widgets {
  mungeWidget is ArmResourceActionAsync<Widget, MungeRequest, MungeResponse>;
}
```

The name of the request body parameter is `body` so you can change the name in clients using an augment decorator

```tsp
@@clientName(Widgets.mungeWidget::parameters.body, "<desired-request-body-parameter-name>");
```

Note that this works for _any_ POST operation template.

### Adding Request Query or Header Parameters

The `Parameters` template parameter allows you to specify additional parameters after the operation path (for example, query and header parameters) in the form of a model, with each model property corresponding to a parameter. You may use intersection to combine multiple separate parameters.

```tsp
// all list query params
listBySubscription is ArmListBySubscription<Widget, Parameters = Azure.Core.StandardListQueryParameters>;

// intersecting individual parameters
listBySubscription is ArmListBySubscription<Widget, Parameters =  Azure.Core.TopQueryParameter & Azure.Core.SkipQueryParameter>;
```

### Changing Response Types

The `Response` parameter allows you to specify non-error responses to the operation.

```tsp
// all list query params
listBySubscription is ArmListBySubscription<Widget, Response = MyCustomCollectionType>;
```

### Changing Error Types

The `Error` parameter allows you to change the default error type used in an operation.

```tsp
// all list query params
listBySubscription is ArmListBySubscription<Widget, Error = MyCustomError>;
```

### Converting Synchronous Operations to LROs

You can generally choose an asynchronous operation template that matches your operation.

#### Templates for Async PUT Operations

- `ArmCreateOrReplaceAsync` is a PUT operation that uses the 'resource' definition in the request body, and return a `200` response and a `201` response, both of which contain the created/updated resource in the response payload. The 201 response contains 'Location` LRO header.

  ```tsp
  createOrUpdate is ArmCreateOrReplaceAsync<Resource>;
  ```

- `ArmCreateOrUpdateAsync`is a PUT operation that uses the 'resource' definition in the request body, and return a `200` response and a `201` response, both of which contain the created/updated resource in the response payload. The 201 response contains 'Azure-AsyncOperation` LRO header.

  ```tsp
  createOrUpdate is ArmCreateOrUpdateAsync<Resource>;
  ```

#### Templates for Async PATCH Operations

- `ArmTagsPatchAsync` is a PATCH operation that only allows changing the resource tags (the minimum for Azure Resource Manager).

  ```tsp
  update is ArmTagsPatchAsync<Resource>;
  ```

- `ArmResourcePatchAsync`is a PATCH operation that uses the visibility settings to select properties for the PATCH request body(any property with no visibility setting, or including visibility "update"). It follows the required 202 pattern to resolve the LRO via location, although this can be customized using the `LroHeaders` parameter.

  ```tsp
  update is ArmResourcePatchAsync<Resource, ResourceProperties>;
  ```

- `ArmCustomPatchAsync`is a PATCH operation that allows you to customize the PATCH request body.

  ```tsp
  update is ArmCustomPatchAsync<Resource, PatchRequestBody>;
  ```

#### Templates for Async POST (Action) Operations

- `ArmResourceActionAsync` is a POST operation that allows you to specify the request and response body for a resource action operation. It follows the required 202 pattern to resolve the LRO via location, although this can be customized using the `LroHeaders` parameter.

  ```tsp
  doStuff is ArmResourceActionAsync<Resource, ActionRequest, ActionResponse>;

  // with no request body
  doStuffNoRequest is ArmResourceActionAsync<Resource, void, ActionResponse>;

  // with no response body
  doStuffCommand is ArmResourceActionAsync<Resource, ActionRequest, void>;
  ```

#### Templates for Async DELETE Operations

- `ArmResourceDeleteWithoutOKAsync` is a DELETE operation that uses no request body, will return a `202` response in the case of an Asynchronous delete operation, and a `204` response in case the resource does not exist.

  ```tsp
  delete is ArmResourceDeleteWithoutOKAsync<Resource>;
  ```

- `ArmResourceDeleteAsync`iis a DELETE operation that uses no request body, and return a `200` response in the case of a successful synchronous delete, a `202` response in the case of an Asynchronous delete operation, and a `204` response in case the resource does not exist.

  ```tsp
  createOrUpdate is ArmResourceDeleteAsync<Resource>;
  ```
