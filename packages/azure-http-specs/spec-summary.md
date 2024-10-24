# Spec Project summary

### Azure_ClientGenerator_Core_Access_InternalOperation

- Endpoints:
  - `get /azure/client-generator-core/access/internalOperation/noDecoratorInInternal`
  - `get /azure/client-generator-core/access/internalOperation/internalDecoratorInInternal`
  - `get /azure/client-generator-core/access/internalOperation/publicDecoratorInInternal`

This scenario contains internal operations. All should be generated but not exposed.
Expected query parameter: name="sample"
Expected response body:

```json
{
  "name": "sample"
}
```

### Azure_ClientGenerator_Core_Access_PublicOperation

- Endpoints:
  - `get /azure/client-generator-core/access/publicOperation/noDecoratorInPublic`
  - `get /azure/client-generator-core/access/publicOperation/publicDecoratorInPublic`

This scenario contains public operations. It should be generated and exported.
Expected query parameter: name="sample"
Expected response body:

```json
{
  "name": "sample"
}
```

### Azure_ClientGenerator_Core_Access_RelativeModelInOperation

- Endpoints:
  - `get /azure/client-generator-core/access/relativeModelInOperation/operation`
  - `get /azure/client-generator-core/access/relativeModelInOperation/discriminator`

This scenario contains internal operations. All should be generated but not exposed.

### Azure_ClientGenerator_Core_Access_SharedModelInOperation

- Endpoints:
  - `get /azure/client-generator-core/access/sharedModelInOperation/public`
  - `get /azure/client-generator-core/access/sharedModelInOperation/internal`

This scenario contains two operations, one public, another internal. The public one should be generated and exported while the internal one should be generated but not exposed.
Expected query parameter: name="sample"
Expected response body:

```json
{
  "name": "sample"
}
```

### Azure_ClientGenerator_Core_FlattenProperty_putFlattenModel

- Endpoint: `put /azure/client-generator-core/flatten-property/flattenModel`

Update and receive model with 1 level of flattening.
Expected input body:

```json
{
  "name": "foo",
  "properties": {
    "description": "bar",
    "age": 10
  }
}
```

Expected response body:

```json
{
  "name": "test",
  "properties": {
    "description": "test",
    "age": 1
  }
}
```

### Azure_ClientGenerator_Core_FlattenProperty_putNestedFlattenModel

- Endpoint: `put /azure/client-generator-core/flatten-property/nestedFlattenModel`

Update and receive model with 2 levels of flattening.
Expected input body:

```json
{
  "name": "foo",
  "properties": {
    "summary": "bar",
    "properties": {
      "description": "test",
      "age": 10
    }
  }
}
```

Expected response body:

```json
{
  "name": "test",
  "properties": {
    "summary": "test",
    "properties": {
      "description": "foo",
      "age": 1
    }
  }
}
```

### Azure_ClientGenerator_Core_Usage_ModelInOperation

- Endpoints:
  - `post /azure/client-generator-core/usage/inputToInputOutput`
  - `post /azure/client-generator-core/usage/outputToInputOutput`
  - `post /azure/client-generator-core/usage/modelInReadOnlyProperty`

This scenario contains two public operations. Both should be generated and exported.
The models are override to roundtrip, so they should be generated and exported as well.

### Azure_Core_Basic_createOrReplace

- Endpoint: `get /azure/core/basic`

Should only generate models named User and UserOrder.

Expected path parameter: id=1
Expected query parameter: api-version=2022-12-01-preview

Expected input body:

```json
{
  "name": "Madge"
}
```

Expected response body:

```json
{
  "id": 1,
  "name": "Madge",
  "etag": "11bdc430-65e8-45ad-81d9-8ffa60d55b59"
}
```

### Azure_Core_Basic_createOrUpdate

- Endpoint: `get /azure/core/basic`

Should only generate models named User and UserOrder.

Expected path parameter: id=1
Expected query parameter: api-version=2022-12-01-preview

Expected input body:

```json
{
  "name": "Madge"
}
```

Expected response body:

```json
{
  "id": 1,
  "name": "Madge"
}
```

### Azure_Core_Basic_delete

- Endpoint: `get /azure/core/basic`

Expected path parameter: id=1

Expected query parameter: api-version=2022-12-01-preview

Expected response of status code 204 with empty body.

### Azure_Core_Basic_export

- Endpoint: `get /azure/core/basic`

Should only generate models named User and UserOrder.

Expected path parameter: id=1
Expected query parameter: format=json
Expected query parameter: api-version=2022-12-01-preview

Expected response body:

```json
{
  "id": 1,
  "name": "Madge",
  "etag": "11bdc430-65e8-45ad-81d9-8ffa60d55b59"
}
```

### Azure_Core_Basic_exportAllUsers

- Endpoint: `post /azure/core/basic`

Should generate a model named User.

Expected query parameter: format=json
Expected query parameter: api-version=2022-12-01-preview

Expected response body:

```json
{
  "users": [
    {
      "id": 1,
      "name": "Madge",
      "etag": "11bdc430-65e8-45ad-81d9-8ffa60d55b59"
    },
    {
      "id": 2,
      "name": "John",
      "etag": "22bdc430-65e8-45ad-81d9-8ffa60d55b59"
    }
  ]
}
```

### Azure_Core_Basic_get

- Endpoint: `get /azure/core/basic`

Should only generate models named User and UserOrder.

Expected path parameter: id=1
Expected query parameter: api-version=2022-12-01-preview

Expected response body:

```json
{
  "id": 1,
  "name": "Madge",
  "etag": "11bdc430-65e8-45ad-81d9-8ffa60d55b59"
}
```

### Azure_Core_Basic_list

- Endpoint: `get /azure/core/basic`

Should only generate models named User and UserOrder.

Should not generate visible model like CustomPage.

Expected query parameter: api-version=2022-12-01-preview&top=5&skip=10&orderby=id&filter=id%20lt%2010&select=id&select=orders&select=etag&expand=orders

Expected response body:

```json
{
  "value": [
    {
      "id": 1,
      "name": "Madge",
      "etag": "11bdc430-65e8-45ad-81d9-8ffa60d55b59",
      "orders": [{ "id": 1, "userId": 1, "detail": "a recorder" }]
    },
    {
      "id": 2,
      "name": "John",
      "etag": "11bdc430-65e8-45ad-81d9-8ffa60d55b5a",
      "orders": [{ "id": 2, "userId": 2, "detail": "a TV" }]
    }
  ]
}
```

### Azure_Core_Lro_Rpc_longRunningRpc

- Endpoint: `post /azure/core/lro/rpc/generations:submit`

Should generate model GenerationOptions and GenerationResult.
GenerationResponse could be generated, depending on implementation.

Expected verb: POST
Expected request body:

```json
{
  "prompt": "text"
}
```

Expected status code: 202
Expected response header: operation-location={endpoint}/generations/operations/operation1
Expected response body:

```json
{
  "id": "operation1",
  "status": "InProgress"
}
```

Expected verb: GET
Expected URL: {endpoint}/generations/operations/operation1

Expected status code: 200
Expected response body:

```json
{
  "id": "operation1",
  "status": "InProgress"
}
```

Expected verb: GET
Expected URL: {endpoint}/generations/operations/operation1

Expected status code: 200
Expected response body:

```json
{
  "id": "operation1",
  "status": "Succeeded",
  "result": {
    "data": "text data"
  }
}
```

### Azure_Core_Lro_Standard_createOrReplace

- Endpoint: `get /azure/core/lro/standard`

Should only generate one model named User.

Expected verb: PUT
Expected path parameter: name=madge

Expected request body:

```json
{
  "role": "contributor"
}
```

Expected status code: 201
Expected response header: operation-location={endpoint}/users/madge/operations/operation1
Expected response body:

```json
{
  "name": "madge",
  "role": "contributor"
}
```

Expected verb: GET
Expected URL: {endpoint}/users/madge/operations/operation1

Expected status code: 200
Expected response body:

```json
{
  "id": "operation1",
  "status": "InProgress"
}
```

Expected verb: GET
Expected URL: {endpoint}/users/madge/operations/operation1

Expected status code: 200
Expected response body:

```json
{
  "id": "operation1",
  "status": "Succeeded"
}
```

(The last GET call on resource URL is optional)
Expected verb: GET
Expected URL: {endpoint}/users/madge

Expected status code: 200
Expected response body:

```json
{
  "name": "madge",
  "role": "contributor"
}
```

### Azure_Core_Lro_Standard_delete

- Endpoint: `get /azure/core/lro/standard`

Expected verb: DELETE
Expected path parameter: name=madge

Expected status code: 202
Expected response header: operation-location={endpoint}/users/madge/operations/operation2
Expected response body:

```json
{
  "id": "operation2",
  "status": "InProgress"
}
```

Expected verb: GET
Expected URL: {endpoint}/users/madge/operations/operation2

Expected status code: 200
Expected response body:

```json
{
  "id": "operation2",
  "status": "InProgress"
}
```

Expected verb: GET
Expected URL: {endpoint}/users/madge/operations/operation2

Expected status code: 200
Expected response body:

```json
{
  "id": "operation2",
  "status": "Succeeded"
}
```

### Azure_Core_Lro_Standard_export

- Endpoint: `get /azure/core/lro/standard`

Should only generate one model named ExportedUser.

Expected verb: POST
Expected path parameter: name=madge
Expected query parameter: format=json

Expected status code: 202
Expected response header: operation-location={endpoint}/users/madge/operations/operation3
Expected response body:

```json
{
  "id": "operation3",
  "status": "InProgress"
}
```

Expected verb: GET
Expected URL: {endpoint}/users/madge/operations/operation3

Expected status code: 200
Expected response body:

```json
{
  "id": "operation3",
  "status": "InProgress"
}
```

Expected verb: GET
Expected URL: {endpoint}/users/madge/operations/operation3

Expected status code: 200
Expected response body:

```json
{
  "id": "operation3",
  "status": "Succeeded",
  "result": {
    "name": "madge",
    "resourceUri": "/users/madge"
  }
}
```

### Azure_Core_Model_AzureCoreEmbeddingVector_get

- Endpoint: `get /azure/core/model/embeddingVector`

Expect to handle an embedding vector. Mock api will return [0, 1, 2, 3, 4]

### Azure_Core_Model_AzureCoreEmbeddingVector_post

- Endpoint: `post /azure/core/model/embeddingVector`

Expect to send a model which has an embedding vector property.

Expected request body:

```json
{ "embedding": [0, 1, 2, 3, 4] }
```

Expected response body:

```json
{ "embedding": [5, 6, 7, 8, 9] }
```

### Azure_Core_Model_AzureCoreEmbeddingVector_put

- Endpoint: `put /azure/core/model/embeddingVector`

Expect to send an embedding vector. Mock api expect to receive [0, 1, 2, 3, 4]

### Azure_Core_Page_listWithCustomPageModel

- Endpoint: `get /azure/core/page/custom-page`

Should ideally only generate models named User and UserOrder. If your language has to, you can also generate CustomPageModel

Expected query parameter: api-version=2022-12-01-preview

Expected response body:

```json
{
  "items": [
    {
      "id": 1,
      "name": "Madge",
      "etag": "11bdc430-65e8-45ad-81d9-8ffa60d55b59"
    }
  ]
}
```

### Azure_Core_Page_listWithPage

- Endpoint: `get /azure/core/page/page`

Should only generate models named User and UserOrder.

Should not generate visible model like Page.

Expected query parameter: api-version=2022-12-01-preview

Expected response body:

```json
{
  "value": [
    {
      "id": 1,
      "name": "Madge",
      "etag": "11bdc430-65e8-45ad-81d9-8ffa60d55b59"
    }
  ]
}
```

### Azure_Core_Page_listWithParameters

- Endpoint: `get /azure/core/page/parameters`

Expected query parameter: api-version=2022-12-01-preview&another=Second

Expected body parameter: {"inputName": "Madge"}

Expected response body:

```json
{
  "value": [
    {
      "id": 1,
      "name": "Madge",
      "etag": "11bdc430-65e8-45ad-81d9-8ffa60d55b59"
    }
  ]
}
```

### Azure_Core_Page_TwoModelsAsPageItem

- Endpoints:
  - `get /azure/core/page/first-item`
  - `get /azure/core/page/second-item`

This scenario is to test two operations with two different page item types.

### Azure_Core_Scalar_AzureLocationScalar_get

- Endpoint: `get /azure/core/scalar/azureLocation`

Expect to handle a azureLocation value. Mock api will return 'eastus'

### Azure_Core_Scalar_AzureLocationScalar_header

- Endpoint: `post /azure/core/scalar/azureLocation/header`

Expect to send a azureLocation value as header.
Expected header parameter: `region="eastus"`

### Azure_Core_Scalar_AzureLocationScalar_post

- Endpoint: `post /azure/core/scalar/azureLocation`

Expect to send a model which has an azureLocation property.

Expected request body:

```json
{ "location": "eastus" }
```

Expected response body:

```json
{ "location": "eastus" }
```

### Azure_Core_Scalar_AzureLocationScalar_put

- Endpoint: `put /azure/core/scalar/azureLocation`

Expect to send a azureLocation value. Mock api expect to receive 'eastus'

### Azure_Core_Scalar_AzureLocationScalar_query

- Endpoint: `post /azure/core/scalar/azureLocation/query`

Expect to send a azureLocation value as query.
Expected query parameter: `region="eastus"`

### Azure_Core_Traits_repeatableAction

- Endpoint: `get /azure/core/traits`

Expected path parameter: id=1
Expected header parameters:

- repeatability-request-id=<any uuid>
- repeatability-first-sent=<any HTTP header date>
  Expected request body:

```json
{
  "userActionValue": "test"
}
```

Expected response header:

- repeatability-result=accepted
  Expected response body:

```json
{
  "userActionResult": "test"
}
```

### Azure_Core_Traits_smokeTest

- Endpoint: `get /azure/core/traits`

SDK should not genreate `clientRequestId` paramerter but use policy to auto-set the header.
Expected path parameter: id=1
Expected query parameter: api-version=2022-12-01-preview
Expected header parameters:

- foo=123
- if-match=valid
- if-none-match=invalid
- if-unmodified-since=Fri, 26 Aug 2022 14:38:00 GMT
- if-modified-since=Thu, 26 Aug 2021 14:38:00 GMT
- x-ms-client-request-id=<any uuid string>

Expected response header:

- bar="456"
- x-ms-client-request-id=<uuid string same with request header>
- etag="11bdc430-65e8-45ad-81d9-8ffa60d55b59"

Expected response body:

```json
{
  "id": 1,
  "name": "Madge"
}
```

### Azure_ResourceManager_CommonProperties_ManagedIdentity_createWithSystemAssigned

- Endpoint: `put https://management.azure.com`

Resource PUT operation.
Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.CommonProperties/managedIdentityTrackedResources/identity",
Expected query parameter: api-version=2023-12-01-preview
Expected request body:

```json
{
  "location": "eastus",
  "tags": {
    "tagKey1": "tagValue1"
  },
  "properties": {},
  "identity": {
    "type": "SystemAssigned"
  }
}
```

Expected response body:

```json
{
  "id":"/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.CommonProperties/managedIdentityTrackedResources/identity",
  "location": "eastus",
  "tags": {
    "tagKey1": "tagValue1"
  },
  "identity": {
    "type": "SystemAssigned",
    "principalId": <any uuid string>,
    "tenantId": <any uuid string>
   },
  "properties": {
    "provisioningState": "Succeeded"
  }
}
```

### Azure_ResourceManager_CommonProperties_ManagedIdentity_get

- Endpoint: `get https://management.azure.com`

Resource GET operation.
Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.CommonProperties/managedIdentityTrackedResources/identity",
Expected query parameter: api-version=2023-12-01-preview

Expected response body:

```json
{
  "id":"/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.CommonProperties/managedIdentityTrackedResources/identity",
  "location": "eastus",
  "tags": {
    "tagKey1": "tagValue1"
  },
  "identity": {
    "type": "SystemAssigned",
    "principalId": <any uuid string>
    "tenantId": <any uuid string>
   },
  "properties": {
    "provisioningState": "Succeeded"
  }
}
```

### Azure_ResourceManager_CommonProperties_ManagedIdentity_updateWithUserAssignedAndSystemAssigned

- Endpoint: `patch https://management.azure.com`

Resource PATCH operation.
Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.CommonProperties/managedIdentityTrackedResources/identity",
Expected query parameter: api-version=2023-12-01-preview
Expected request body:

```json
{
  "identity": {
    "type": "SystemAssigned,UserAssigned",
    "userAssignedIdentities": {
      "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id1": {}
    }
  }
}
```

Expected response body:

```json
{
  "id":"/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.CommonProperties/managedIdentityTrackedResources/identity",
  "location": "eastus",
  "tags": {
    "tagKey1": "tagValue1"
  },
  "identity": {
    "type": "SystemAssigned,UserAssigned",
    "userAssignedIdentities": {
      "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id1": {
        "principalId": <any uuid string>,
        "clientId": <any uuid string>
      },
    },
    "principalId": <any uuid string>,
    "tenantId": <any uuid string>
  },
  "properties": {
    "provisioningState": "Succeeded"
  }
}
```

### Azure_ResourceManager_Resources_Nested_createOrReplace

- Endpoint: `put https://management.azure.com`

Resource PUT operation.
Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/nestedProxyResources/nested
Expected query parameter: api-version=2023-12-01-preview
Expected request body:

```json
{
  "properties": {
    "description": "valid"
  }
}
```

Expected response body:

```json
{
  "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/nestedProxyResources/nested",
  "name": "nested",
  "type": "nested",
  "properties":{
    "description": "valid",
    "provisioningState": "Succeeded"
  },
  "systemData": {
    "createdBy": "AzureSDK",
    "createdByType": "User",
    "createdAt": <any date>,
    "lastModifiedBy": "AzureSDK",
    "lastModifiedAt": <any date>,
    "lastModifiedByType": "User",
  }
}
```

### Azure_ResourceManager_Resources_Nested_delete

- Endpoint: `delete https://management.azure.com`

Resource DELETE operation.
Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/nestedProxyResources/nested
Expected query parameter: api-version=2023-12-01-preview
Expected response status code: 204

### Azure_ResourceManager_Resources_Nested_get

- Endpoint: `get https://management.azure.com`

Resource GET operation.
Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/nestedProxyResources/nested
Expected query parameter: api-version=2023-12-01-preview

Expected response body:

```json
{
  "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/nestedProxyResources/nested",
  "name": "nested",
  "type": "nested",
  "properties":{
    "description": "valid",
    "provisioningState": "Succeeded"
  },
  "systemData": {
    "createdBy": "AzureSDK",
    "createdByType": "User",
    "createdAt": <any date>,
    "lastModifiedBy": "AzureSDK",
    "lastModifiedAt": <any date>,
    "lastModifiedByType": "User",
  }
}
```

### Azure_ResourceManager_Resources_Nested_listByTopLevelTrackedResource

- Endpoint: `get https://management.azure.com`

Resource LIST by parent resource operation.
Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/nestedProxyResources/nested
Expected query parameter: api-version=2023-12-01-preview

Expected response body:

```json
{
  "value": [{
    "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/nestedProxyResources/nested",
    "name": "nested",
    "type": "nested",
    "properties":{
      "description": "valid",
      "provisioningState": "Succeeded"
    },
    "systemData": {
      "createdBy": "AzureSDK",
      "createdByType": "User",
      "createdAt": <any date>,
      "lastModifiedBy": "AzureSDK",
      "lastModifiedAt": <any date>,
      "lastModifiedByType": "User",
    }
  }]
}
```

### Azure_ResourceManager_Resources_Nested_update

- Endpoint: `patch https://management.azure.com`

Resource PATCH operation.
Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/nestedProxyResources/nested
Expected query parameter: api-version=2023-12-01-preview
Expected request body:

```json
{
  "properties": {
    "description": "valid2"
  }
}
```

Expected response body:

```json
{
  "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/nestedProxyResources/nested",
  "name": "nested",
  "type": "nested",
  "properties":{
    "description": "valid2",
    "provisioningState": "Succeeded"
  },
  "systemData": {
    "createdBy": "AzureSDK",
    "createdByType": "User",
    "createdAt": <any date>,
    "lastModifiedBy": "AzureSDK",
    "lastModifiedAt": <any date>,
    "lastModifiedByType": "User",
  }
}
```

### Azure_ResourceManager_Resources_Singleton_createOrUpdate

- Endpoint: `put https://management.azure.com`

Resource PUT operation.
Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/singletonTrackedResources/default
Expected query parameter: api-version=2023-12-01-preview
Expected request body:

```json
{
  "location": "eastus",
  "properties": {
    "description": "valid"
  }
}
```

Expected response body:

```json
{
  "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/singletonTrackedResources/default",
  "name": "default",
  "type": "Azure.ResourceManager.Resources/singletonTrackedResources",
  "location": "eastus",
  "properties": {
    "description": "valid",
    "provisioningState": "Succeeded"
  },
  "systemData": {
    "createdBy": "AzureSDK",
    "createdByType": "User",
    "createdAt": <any date>,
    "lastModifiedBy": "AzureSDK",
    "lastModifiedAt": <any date>,
    "lastModifiedByType": "User",
  }
}
```

### Azure_ResourceManager_Resources_Singleton_getByResourceGroup

- Endpoint: `get https://management.azure.com`

Resource GET operation.
Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/singletonTrackedResources/default
Expected query parameter: api-version=2023-12-01-preview

Expected response body:

```json
{
  "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/singletonTrackedResources/default",
  "name": "default",
  "type": "Azure.ResourceManager.Resources/singletonTrackedResources",
  "location": "eastus",
  "properties":{
    "description": "valid",
    "provisioningState": "Succeeded"
  },
  "systemData": {
    "createdBy": "AzureSDK",
    "createdByType": "User",
    "createdAt": <any date>,
    "lastModifiedBy": "AzureSDK",
    "lastModifiedAt": <any date>,
    "lastModifiedByType": "User",
  }
}
```

### Azure_ResourceManager_Resources_Singleton_listByResourceGroup

- Endpoint: `get https://management.azure.com`

Resource LIST by resource group operation.
Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/singletonTrackedResources
Expected query parameter: api-version=2023-12-01-preview

Expected response body:

```json
{
  "value": [{
    "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/singletonTrackedResources/default",
    "name": "default",
    "type": "Azure.ResourceManager.Resources/singletonTrackedResources",
    "location": "eastus",
    "properties":{
      "description": "valid",
      "provisioningState": "Succeeded"
    },
    "systemData": {
      "createdBy": "AzureSDK",
      "createdByType": "User",
      "createdAt": <any date>,
      "lastModifiedBy": "AzureSDK",
      "lastModifiedAt": <any date>,
      "lastModifiedByType": "User",
    }
  }]
}
```

### Azure_ResourceManager_Resources_Singleton_update

- Endpoint: `patch https://management.azure.com`

Resource PATCH operation.
Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/singletonTrackedResources/default
Expected query parameter: api-version=2023-12-01-preview
Expected request body:

```json
{
  "location": "eastus",
  "properties": {
    "description": "valid2"
  }
}
```

Expected response body:

```json
{
  "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/singletonTrackedResources/default",
  "name": "default",
  "type": "Azure.ResourceManager.Resources/singletonTrackedResources",
  "location": "eastus",
  "properties":{
    "description": "valid2",
    "provisioningState": "Succeeded"
  },
  "systemData": {
    "createdBy": "AzureSDK",
    "createdByType": "User",
    "createdAt": <any date>,
    "lastModifiedBy": "AzureSDK",
    "lastModifiedAt": <any date>,
    "lastModifiedByType": "User",
  }
}
```

### Azure_ResourceManager_Resources_TopLevel_actionSync

- Endpoint: `post https://management.azure.com`

  Resource sync action.
  Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/actionSync
  Expected query parameter: api-version=2023-12-01-preview
  Expected request body:

  ```json
  {
    "message": "Resource action at top level.",
    "urgent": true
  }
  ```

### Azure_ResourceManager_Resources_TopLevel_createOrReplace

- Endpoint: `put https://management.azure.com`

Resource PUT operation.
Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top
Expected query parameter: api-version=2023-12-01-preview
Expected request body:

```json
{
  "location": "eastus",
  "properties": {
    "description": "valid"
  }
}
```

Expected response body:

```json
{
  "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top",
  "name": "top",
  "type": "topLevel",
  "location": "eastus",
  "properties": {
    "description": "valid",
    "provisioningState": "Succeeded"
  },
  "systemData": {
    "createdBy": "AzureSDK",
    "createdByType": "User",
    "createdAt": <any date>,
    "lastModifiedBy": "AzureSDK",
    "lastModifiedAt": <any date>,
    "lastModifiedByType": "User",
  }
}
```

### Azure_ResourceManager_Resources_TopLevel_delete

- Endpoint: `delete https://management.azure.com`

Resource DELETE operation.
Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top
Expected query parameter: api-version=2023-12-01-preview

````
Expected response status code: 204

### Azure_ResourceManager_Resources_TopLevel_get

- Endpoint: `get https://management.azure.com`

Resource GET operation.
Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top
Expected query parameter: api-version=2023-12-01-preview

Expected response body:
```json
{
  "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top",
  "name": "top",
  "type": "topLevel",
  "location": "eastus",
  "properties":{
    "description": "valid",
    "provisioningState": "Succeeded"
  },
  "systemData": {
    "createdBy": "AzureSDK",
    "createdByType": "User",
    "createdAt": <any date>,
    "lastModifiedBy": "AzureSDK",
    "lastModifiedAt": <any date>,
    "lastModifiedByType": "User",
  }
}
````

### Azure_ResourceManager_Resources_TopLevel_listByResourceGroup

- Endpoint: `get https://management.azure.com`

Resource LIST by resource group operation.
Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources
Expected query parameter: api-version=2023-12-01-preview

Expected response body:

```json
{
  "value": [{
    "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top",
    "name": "top",
    "type": "topLevel",
    "location": "eastus",
    "properties":{
      "description": "valid",
      "provisioningState": "Succeeded"
    },
    "systemData": {
      "createdBy": "AzureSDK",
      "createdByType": "User",
      "createdAt": <any date>,
      "lastModifiedBy": "AzureSDK",
      "lastModifiedAt": <any date>,
      "lastModifiedByType": "User",
    }
  }]
}
```

### Azure_ResourceManager_Resources_TopLevel_listBySubscription

- Endpoint: `get https://management.azure.com`

Resource LIST by subscription operation.
Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources
Expected query parameter: api-version=2023-12-01-preview

Expected response body:

```json
{
  "value": [{
    "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top",
    "name": "top",
    "type": "topLevel",
    "location": "eastus",
    "properties":{
      "description": "valid",
      "provisioningState": "Succeeded"
    },
    "systemData": {
      "createdBy": "AzureSDK",
      "createdByType": "User",
      "createdAt": <any date>,
      "lastModifiedBy": "AzureSDK",
      "lastModifiedAt": <any date>,
      "lastModifiedByType": "User",
    }
  }]
}
```

### Azure_ResourceManager_Resources_TopLevel_update

- Endpoint: `patch https://management.azure.com`

Resource PATCH operation.
Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top
Expected query parameter: api-version=2023-12-01-preview
Expected request body:

```json
{
  "properties": {
    "description": "valid2"
  }
}
```

Expected response body:

```json
{
  "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top",
  "name": "top",
  "type": "topLevel",
  "location": "eastus",
  "properties":{
    "description": "valid2",
    "provisioningState": "Succeeded"
  },
  "systemData": {
    "createdBy": "AzureSDK",
    "createdByType": "User",
    "createdAt": <any date>,
    "lastModifiedBy": "AzureSDK",
    "lastModifiedAt": <any date>,
    "lastModifiedByType": "User",
  }
}
```

### Azure_SpecialHeaders_XmsClientRequestId

- Endpoint: `get /azure/special-headers/x-ms-client-request-id/`

Test case for azure client request id header. SDK should not generate `clientRequestId` paramerter but use policy to auto-set the header.
Expected header parameters:

- x-ms-client-request-id=<any uuid string>
  Expected response header:
- x-ms-client-request-id=<uuid string same with request header>

### Client_AzureExampleClient_basicAction

- Endpoint: `post /azure/example/basic/basic`

Expected request and response is same as the JSON example at examples/2022-12-01-preview/basic.json

When generate the code, one need to set the "examples-directory" option.

Expected query parameter: query-param=query&api-version=2022-12-01-preview
Expected header parameter: header-param=header

Expected input body:

```json
{
  "stringProperty": "text",
  "modelProperty": {
    "int32Property": 1,
    "float32Property": 1.5,
    "enumProperty": "EnumValue1"
  },
  "arrayProperty": ["item"],
  "recordProperty": {
    "record": "value"
  }
}
```

Expected response body:

```json
{
  "stringProperty": "text"
}
```

### Client_Naming_Header_request

- Endpoint: `post /client/naming/header`

Testing that we can project a header name.
Your generated SDK should generate an operation header `parameter` with a single parameter called `clientName`.

Expected header parameter: `default-name="true"`

### Client_Naming_Header_response

- Endpoint: `get /client/naming/header`

Testing that we can project a header name.
Your generated SDK should generate an operation header `parameter` with a single parameter called `clientName`.

Expected response header: `default-name="true"`

### Client_Naming_Model_client

- Endpoint: `post /client/naming/model/client`

Testing that we can project the client name in our generated SDKs.
Your generated SDK should generate the model with name `ClientModel`.

Expected request body:

```json
{ "defaultName": true }
```

### Client_Naming_Model_language

- Endpoint: `post /client/naming/model/language`

Testing that we can project the language specific name in our generated SDKs.
Your generated SDK should generate the model with your language specific model name.

Expected request body:

```json
{ "defaultName": true }
```

### Client_Naming_operation

- Endpoint: `post /client/naming/operation`

Testing that we can project the operation name.
Your generated SDK should generate an operation called `clientName`.

Expected status code: 204

### Client_Naming_parameter

- Endpoint: `post /client/naming/parameter`

Testing that we can project a parameter name.
Your generated SDK should generate an operation `parameter` with a single parameter called `clientName`.

Expected query parameter: `defaultName="true"`

### Client_Naming_Property_client

- Endpoint: `post /client/naming/property/client`

Testing that we can project the client name in our generated SDKs.
Your generated SDK should generate ClientNameModel with one property `clientName` with wire name `defaultName`.

Expected request body:

```json
{ "defaultName": true }
```

### Client_Naming_Property_compatibleWithEncodedName

- Endpoint: `post /client/naming/property/compatible-with-encoded-name`

Testing that we can project the client name and the wire name.
Your generated SDK should generate ClientNameAndJsonEncodedNameModel with one property with client name `clientName` and wire name `wireName`.

Expected request body:

```json
{ "wireName": true }
```

### Client_Naming_Property_language

- Endpoint: `post /client/naming/property/language`

Testing that we can project the language specific name in our generated SDKs.
Your generated SDK should generate LanguageClientNameModel with one property with your language specific property name and wire name `defaultName`.

Expected request body:

```json
{ "defaultName": true }
```

### Client_Naming_UnionEnum_unionEnumMemberName

- Endpoint: `post /client/naming/union-enum/union-enum-member-name`

  Testing that we can project a enum name and enum value name.
  Your generated SDK should generate an Enum with members "ClientEnumValue1", "ClientEnumValue2".
  (The exact name may depend on language convention)

  Expected request body:

  ```json
  "value1"
  ```

### Client_Naming_UnionEnum_unionEnumName

- Endpoint: `post /client/naming/union-enum/union-enum-name`

  Testing that we can project a enum name and enum value name.
  Your generated SDK should generate an Enum "ClientExtensibleEnum".
  (The exact name may depend on language convention)

  Expected request body:

  ```json
  "value1"
  ```

### Client_Structure_AnotherClientOperationGroup

- Endpoints:
  - `post /client/structure/{client}/six`
  - `post /client/structure/{client}/five`

This is to show we can have multiple clients, with multiple operation groups in each client.
The client and its operation groups can be moved to a sub namespace/package.

```ts
const client2 = new SubNamespace.SecondClient("client-operation-group");

client2.five();
client2.group5.six();
```

### Client_Structure_ClientOperationGroup

- Endpoints:
  - `post /client/structure/{client}/two`
  - `post /client/structure/{client}/three`
  - `post /client/structure/{client}/four`
  - `post /client/structure/{client}/one`

This is to show we can have multiple clients, with multiple operation groups in each client.

```ts
const client1 = new FirstClient("client-operation-group");

client1.one();

client1.group3.two();
client1.group3.three();

client1.group4.four();
```

### Client_Structure_MultiClient

- Endpoints:
  - `post /client/structure/{client}/one`
  - `post /client/structure/{client}/three`
  - `post /client/structure/{client}/five`
  - `post /client/structure/{client}/two`
  - `post /client/structure/{client}/four`
  - `post /client/structure/{client}/six`

Include multiple clients in the same spec.

```ts
const clientA = new ClientAClient("multi-client");
const clientB = new ClientBClient("multi-client");

clientA.renamedOne();
clientA.renamedThree();
clientA.renamedFive();

clientB.renamedTwo();
clientB.renamedFour();
clientB.renamedSix();
```

### Client_Structure_RenamedOperation

- Endpoints:
  - `post /client/structure/{client}/two`
  - `post /client/structure/{client}/four`
  - `post /client/structure/{client}/six`
  - `post /client/structure/{client}/one`
  - `post /client/structure/{client}/three`
  - `post /client/structure/{client}/five`

This is to show we can have more than one operation group in a client. The client side should be able to call the api like

```ts
const client = new RenamedOperationClient("renamed-operation");

client.renamedOne();
client.renamedThree();
client.renamedFive();

client.group.renamedTwo();
client.group.renamedFour();
client.group.renamedSix();
```

### Client_Structure_Service

- Endpoints:
  - `post /client/structure/{client}/seven`
  - `post /client/structure/{client}/nine`
  - `post /client/structure/{client}/eight`
  - `post /client/structure/{client}/three`
  - `post /client/structure/{client}/four`
  - `post /client/structure/{client}/five`
  - `post /client/structure/{client}/six`
  - `post /client/structure/{client}/one`
  - `post /client/structure/{client}/two`

This is to show that if we don't do any customization. The client side should be able to call the api like

```ts
const client = new ServiceClient("default");
client.one();
client.two();
client.foo.three();
client.foo.four();
client.bar.five();
client.bar.six();
client.baz.foo.seven();
client.qux.eight();
client.qux.bar.nine();
```

### Client_Structure_TwoOperationGroup

- Endpoints:
  - `post /client/structure/{client}/one`
  - `post /client/structure/{client}/three`
  - `post /client/structure/{client}/four`
  - `post /client/structure/{client}/two`
  - `post /client/structure/{client}/five`
  - `post /client/structure/{client}/six`

This is to show we can have more than one operation group in a client. The client side should be able to call the api like

```ts
const client = new TwoOperationGroupClient("two-operation-group");

client.group1.one();
client.group1.three();
client.group1.four();

client.group2.two();
client.group2.five();
client.group2.six();
```

### Payload_Pageable_list

- Endpoint: `get /payload/pageable`

List users.

SDK may hide the "maxpagesize" from API signature. The functionality of "maxpagesize" could be in related language Page model.

Expected query parameter:
maxpagesize=3

Expected response body:

```json
{
  "value": [
    {
      "name": "user5"
    },
    {
      "name": "user6"
    },
    {
      "name": "user7"
    }
  ],
  "nextLink": "{endpoint}/payload/pageable?skipToken=name-user7&maxpagesize=3"
}
```

Expected query parameter:
skipToken=name-user7
maxpagesize=3

```json
{
  "value": [
    {
      "name": "user8"
    }
  ]
}
```

### Resiliency_ServiceDriven_addOperation

- Endpoint: `delete /resiliency/service-driven/client:v2/service:{serviceDeploymentVersion}/api-version:{apiVersion}/add-operation`

Need the following two calls:

- Call with client spec version "v1" with `serviceDeploymentVersion="v2"` and `apiVersion="v2"`
- Call with client spec version "v2" with `serviceDeploymentVersion="v2"` and `apiVersion="v2"`

There are three concepts that should be clarified:

1. Client spec version: refers to the spec that the client is generated from. 'v1' is a client generated from old.tsp and 'v2' is a client generated from main.tsp.
2. Service deployment version: refers to a deployment version of the service. 'v1' represents the initial deployment of the service with a single api version. 'v2' represents the new deployment of a service with multiple api versions
3. Api version: The initial deployment of the service only supports api version 'v1'. The new deployment of the service supports api versions 'v1' and 'v2'.

With the above two calls, we test the following configurations from this service spec:

- A client generated from the first service spec can break the glass and call the second deployment of a service with api version v2
- A client generated from the second service spec can call the second deployment of a service with api version v2 with the updated changes

Tests that we can grow up by adding an operation.

### Resiliency_ServiceDriven_AddOptionalParam_fromNone

- Endpoint: `head /resiliency/service-driven/client:v2/service:{serviceDeploymentVersion}/api-version:{apiVersion}/add-optional-param/from-none`

Need the following two calls:

- Pass in `serviceDeploymentVersion="v2"` and `apiVersion="v1"` with no parameters.
- Pass in `serviceDeploymentVersion="v2"` and `apiVersion="v2"` with query parameter `new-parameter="new"`.

There are three concepts that should be clarified:

1. Client spec version: refers to the spec that the client is generated from. 'v1' is a client generated from old.tsp and 'v2' is a client generated from main.tsp.
2. Service deployment version: refers to a deployment version of the service. 'v1' represents the initial deployment of the service with a single api version. 'v2' represents the new deployment of a service with multiple api versions
3. Api version: The initial deployment of the service only supports api version 'v1'. The new deployment of the service supports api versions 'v1' and 'v2'.

With the above two calls, we test the following configurations from this service spec:

- A client generated from the second service spec can call the second deployment of a service with api version v1
- A client generated from the second service spec can call the second deployment of a service with api version v2 with the updated changes

Tests that we can grow up an operation from accepting no parameters to accepting an optional input parameter.

### Resiliency_ServiceDriven_AddOptionalParam_fromOneOptional

- Endpoint: `get /resiliency/service-driven/client:v2/service:{serviceDeploymentVersion}/api-version:{apiVersion}/add-optional-param/from-one-optional`

Need the following two calls:

- Pass in `serviceDeploymentVersion="v2"` and `apiVersion="v1"` with query parameter `parameter="optional"`.
- Pass in `serviceDeploymentVersion="v2"` and `apiVersion="v2"` with query parameter `parameter="optional"` and query parameter `new-parameter="new"`.

There are three concepts that should be clarified:

1. Client spec version: refers to the spec that the client is generated from. 'v1' is a client generated from old.tsp and 'v2' is a client generated from main.tsp.
2. Service deployment version: refers to a deployment version of the service. 'v1' represents the initial deployment of the service with a single api version. 'v2' represents the new deployment of a service with multiple api versions
3. Api version: The initial deployment of the service only supports api version 'v1'. The new deployment of the service supports api versions 'v1' and 'v2'.

With the above two calls, we test the following configurations from this service spec:

- A client generated from the second service spec can call the second deployment of a service with api version v1
- A client generated from the second service spec can call the second deployment of a service with api version v2 with the updated changes

Tests that we can grow up an operation from accepting one optional parameter to accepting two optional parameters.

### Resiliency_ServiceDriven_AddOptionalParam_fromOneRequired

- Endpoint: `get /resiliency/service-driven/client:v2/service:{serviceDeploymentVersion}/api-version:{apiVersion}/add-optional-param/from-one-required`

Need the following two calls:

- Pass in `serviceDeploymentVersion="v2"` and `apiVersion="v1"` with query parameter `parameter="required"`.
- Pass in `serviceDeploymentVersion="v2"` and `apiVersion="v2"` with query parameter `parameter="required"` and query parameter `new-parameter="new"`.

There are three concepts that should be clarified:

1. Client spec version: refers to the spec that the client is generated from. 'v1' is a client generated from old.tsp and 'v2' is a client generated from main.tsp.
2. Service deployment version: refers to a deployment version of the service. 'v1' represents the initial deployment of the service with a single api version. 'v2' represents the new deployment of a service with multiple api versions
3. Api version: The initial deployment of the service only supports api version 'v1'. The new deployment of the service supports api versions 'v1' and 'v2'.

With the above two calls, we test the following configurations from this service spec:

- A client generated from the second service spec can call the second deployment of a service with api version v1
- A client generated from the second service spec can call the second deployment of a service with api version v2 with the updated changes

Tests that we can grow up an operation from accepting one required parameter to accepting a required parameter and an optional parameter.
