---
title: Understanding the Must-have Breaking Changes
---

To fully leverage the benefits of TypeSpec and follow best practices, there are some unavoidable breaking changes you will encounter after migrating from Swagger to TypeSpec.

## Using Resources from Common Types

If your resource definition already extends from a resource type in [common-types](https://github.com/Azure/azure-rest-api-specs/tree/main/specification/common-types/resource-management), you can skip this section. Otherwise, you should understand how we identify resource models and select appropriate base models from the TypeSpec resource manager library.

A model is identified as a resource when it meets **all** of the following criteria:

1. There is a GET operation for the model.
2. At least one operation returns a 200 response containing this model.
3. The model has properties named `id`, `name`, and `type`.

Once a model is identified as a resource, we represent it by extending an appropriate [resource model](../../howtos/ARM/resource-type.md#modeling-resources-in-typespec) from the TypeSpec library. This results in differences between your original Swagger and generated Swagger like:

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

We recommend accepting this change to align with ARM conventions. However, if you have a strong business justification to keep your original definition, you can use the `@customAzureResource` decorator to mark your model.

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
