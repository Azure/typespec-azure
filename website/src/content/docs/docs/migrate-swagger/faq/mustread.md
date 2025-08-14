---
title: Understanding the Swagger Changes
---

To fully leverage the benefits of TypeSpec and follow best practices, there are some unavoidable changes when migrating from Swagger to TypeSpec.

## Using Resources from Common Types

If your resource definition already extends from a resource type in [common-types](https://github.com/Azure/azure-rest-api-specs/tree/main/specification/common-types/resource-management), skip this section. This section explains how resource models are identified and appropriate base models from the TypeSpec resource manager library are selected.

An ARM Resource model should extend one of the typespec common-types Resource models when it meets **all** of the following criteria:

1. There is a GET operation for the model.
2. At least one operation returns a 200 response containing this model.
3. The model has properties named `id`, `name`, and `type`.

Once a model is identified as a resource, it is represented by extending an appropriate [resource model](../../howtos/ARM/resource-type.md#modeling-resources-in-typespec) from the TypeSpec library. This can result in textual differences between the original Swagger and generated Swagger like:

```diff
"YourResource": {
  "type": "object",
  "properties": {
    "properties": {
      "$ref": "#/definitions/YourResourceProperties",
    }
  },
  "allOf": [
    {
-      "$ref": "#/definitions/YourOwnProxyResourceDefinition"
+      "$ref": "../../../../../common-types/resource-management/v3/types.json#/definitions/ProxyResource"
    }
  ]
}
```

Accept this change to align with ARM conventions. If there is a strong business justification to keep the original definition, use the `@customAzureResource` decorator to mark the model.

```tsp
model YourResource extends YourOwnProxyResourceDefinition {
  properties: YourResourceProperties;
}

@Azure.ResourceManager.Legacy.customAzureResource
model YourOwnProxyResourceDefinition {
  @key
  @path
  @segment("yourSegment")
  name: string;
}
```

## Using Page Model from Library

By default, pageable operations use `Azure.ResourceManager.ResourceListResult<YourResource>`, which generates a response model named `{YourResource}ListResult`. This follows ARM conventions and is the recommended approach for most ARM resource operations:

```tsp
@armResourceOperations
interface YourResources {
  @doc("List all resources")
  list is ArmResourceListByParent<YourResource>;
}
```

`Azure.ResourceManager.ResourceListResult` makes the `value` property in `{YourResource}ListResult` required, and the type of the `nextLink` property becomes `url`. 

## Handling "readOnly" in Model Schemas

The `"readOnly": true` property should only be used on properties, not on models. If a model is mistakenly markedas readOnly and other models refer to it, like this:

```json
"ReadOnlyModel": {
  "readOnly": true
},
"ReferToReadOnlyModel": {
  "properties": {
    "property": {
      "$ref": "#/definitions/ReadOnlyModel"
    }
  }
}
```

Decorating the property referencing the model with '@visibility(Lifecycle.Read)` is equivalent to marking the model schema as read-only as in the Swagger above.

```tsp
model ReadOnlyModel {}

model ReferToReadOnlyModel {
  @visibility(Lifecycle.Read)
  property: ReadOnlyModel;
}
```
