# Migrating Azure Resource Manager Swagger to TypeSpec

The Swagger Converter will not be able to accurately represent every part of every API in TypeSpec. This document
outlines some common changes you might need to make to a converted TypeSpec to make it conform to your existing service API and  
pass check-in validations.

## Resolving Swagger Breaking Change Violations

### Changing the Names of Request Payload Parameters

For operations with non-empty request bodies (PUT, POST, PATCH), the TypeSpec operation templates provide a default name for the
request parameter corresponding to the request payload. You can use augment decorators to make changes to this parameter, and other parts of the operation signature.

#### CreateOrUpdate (PUT) APIs

Given a PUT operation, for example:

```tsp
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
}
```

The name of the request body parameter is `resource` so you can change the name in clients using an augment decorator

```tsp
@@projectedName(Widgets.createOrUpdate::parameters.resource,
  "client",
  "<desired-request-body-parameter-name>"
);
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
@@projectedName(Widgets.update::parameters.properties,
  "client",
  "<desired-request-body-parameter-name>"
);
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
@@projectedName(Widgets.mungeWidget::parameters.body,
  "client",
  "<desired-request-body-parameter-name>"
);
```

Note that this works for _any_ POST operation template.

### Adding Request Query Parameters

The `Parameters` template parameter allows you to specify additional parameters after the operation path (for example, query and header parameters) in the form of a model, with each model property corresponding to a parameter. You may use intersection to combine multiple separate parameters.

```tsp
listBySubscription is ArmListBySubscription<Widget, Parameters = Azure.Core.StandardListQueryParameters>;
```

### Converting Synchronous Operations to LROs

You can generally choose an asynchronous operation template that matches your operation.

#### Templates for Async PUT Operations

- `ArmAsyncCreateOrReplace` is a PUT operation that uses the 'resource' definitiaon in the request body, and return a `200` response and a `201` response, both of which contain the created/updated resource in the response payload. The 201 response contains 'Location` LRO header.

  ```tsp
  createOrUpdate is ArmCreateOrReplaceAsync<Resource>;
  ```

- `ArmAsyncCreateOrUpdate`is a PUT operation that uses the 'resource' definitiaon in the request body, and return a `200` response and a `201` response, both of which contain the created/updated resource in the response payload. The 201 response contains 'Azure-AsyncOperation` LRO header.

  ```tsp
  createOrUpdate is ArmCreateOrReplaceAsync<Resource>;
  ```

#### Templates for Async PATCH Operations

- `ArmAsyncCreateOrReplace` is a PUT operation that uses the 'resource' definitiaon in the request body, and return a `200` response and a `201` response, both of which contain the created/updated resource in the response payload. The 201 response contains 'Location` LRO header.

  ```tsp
  createOrUpdate is ArmCreateOrReplaceAsync<Resource>;
  ```

- `ArmAsyncCreateOrUpdate`is a PUT operation that uses the 'resource' definitiaon in the request body, and return a `200` response and a `201` response, both of which contain the created/updated resource in the response payload. The 201 response contains 'Azure-AsyncOperation` LRO header.

  ```tsp
  createOrUpdate is ArmCreateOrReplaceAsync<Resource>;
  ```

#### Templates for Async POST Operations

- `ArmResourceActionAsync` is a PUT operation that uses the 'resource' definitiaon in the request body, and return a `200` response and a `201` response, both of which contain the created/updated resource in the response payload. The 201 response contains 'Location` LRO header.

  ```tsp
  createOrUpdate is ArmCreateOrReplaceAsync<Resource>;
  ```

- `ArmResourceActionNoResponseContentAsync`is a PUT operation that uses the 'resource' definitiaon in the request body, and return a `200` response and a `201` response, both of which contain the created/updated resource in the response payload. The 201 response contains 'Azure-AsyncOperation` LRO header.

  ```tsp
  createOrUpdate is ArmCreateOrReplaceAsync<Resource>;
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

## Resolving Swagger LintDiff Violations

### VisibilityChanged for `nextLink` and `value` properties

The issue is that some older specifications marked these values as read only. This has no real impact on the API or client generation, but it is easy to mitigate for the whole specification. To fix, simply add the following augment decorator statements to the `main.tsp` file.

```tsp
@@visibility(Azure.Core.Page.value, "read");
@@visibility(Azure.Core.Page.nextLink, "read");
```
