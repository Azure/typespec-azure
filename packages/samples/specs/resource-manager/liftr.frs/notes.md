Azure Resource API design

// Tenant is a heavily overloaded term, people generally associate it with AzureAD tenants - does this term relate to AzureAD tenants
// If not, this should probably be renamed to avoid confusion.

1. [GET] list one tenant with tenant id

{
/// I assume that the URI for get is /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Fluid/fluidclusters/{name}
"parameter": {
"subscriptionId": "my-subscription-id",
"resourceGroupName": "my-rg-name",
/// We should try to use 'name' as the parameter name for source name, especially if this is intended to be set by the user,
/// rather than a generated GUID
"tenantId": "my-tenant", // resource name
"api-version": "2021-02-01"
},
"response": {
"200": {
"description": "The tenant has been retrieved successfully.",
"body": {

    			/// I assume this is a tracked resource, and so should have all associated properties (location, tags)
    			"id": "/subscriptions/my-subscription-id/resourceGroups/my-rg-name/providers/Microsoft.Fluid/fluidclusters/my-tenant",
    			"name": "my-tenant",
    			"type": "Microsoft.Fluid/fluidclusters",
    			"properties" : {
    				// Why does this need to be repeated in rp-specific properties?
    				"tenantId": "my-tenant",
    				"frsEndpoints:": {
    					"ordererEndpoint": "http://localhost:3003",
    					"storageEndpoint": "http://localhost:3001"
    				}
    			}
    		}
    	}
    }

}

2. [GET] list all tenants
   /// Assume that the URI is /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Fluid/fluidclusters
   {
   "parameter": {
   "subscriptionId": "my-subscription-id",
   "resourceGroupName": "my-rg-name",
   "api-version": "2021-02-01",
   },
   "response": {
   "200": {
   "description": "All tenants have been retrieved successfully.",
   "body": {
   /// Should be 'values'. also, should have a 'nextLink' property to allow paging
   "value": [
   {
   "id": "/subscriptions/my-subscription-id/resourceGroups/my-rg-name/providers/Microsoft.Fluid/fluidclusters/my-tenant-1",
   "name": "my-tenant-1",
   "type": "Microsoft.Fluid/fluidclusters",
   "properties": {
   "tenantId": "my-tenant-1",
   "frsEndpoints:": {
   "ordererEndpoint": "http://localhost:3003",
   "storageEndpoint": "http://localhost:3001"
   }
   }
   }
   ]
   }
   }
   }
   }

3. [PUT] create a tenant
   /// Same URI as GET
   {
   "parameter": {
   "subscriptionId": "my-subscription-id",
   "resourceGroupName": "my-rg-name",
   "tenantId": "my-tenant",
   "api-version": "2021-02-01",
   "createParameters": {
   "tags": {
   "tagKey": "tagvalue"
   }
   }
   },
   "response": {
   "201": {
   "description": "New tenant has been created successfully.",
   /// Normally location is a required property, also input tags should mean tags in the output
   /// Is this operation potentially asynchronous, or does it always complete synchronously?
   "body": {
   "id": "/subscriptions/my-subscription-id/resourceGroups/my-rg-name/providers/Microsoft.Fluid/fluidclusters/my-tenant",
   "name": "my-tenant",
   "type": "Microsoft.Fluid/fluidclusters",
   "properties": {
   "tenantId": "my-tenant",
   "frsEndpoints:": {
   "ordererEndpoint": "http://localhost:3003",
   "storageEndpoint": "http://localhost:3001"
   }
   }
   }
   }
   }
   }

4. [PUT] update a tenant
   /// Same comments as PUT/Create, although here, I would expect that location cannot be changed
   /// ASK: Can you specify which properties can be changed in this PUT/update and which properties cannot?
   /// In general, id, name, and location from the outer envelope are immutable after creation (using PUT)
   {
   "parameter": {
   "subscriptionId": "my-subscription-id",
   "resourceGroupName": "my-rg-name",
   "tenantId": "my-tenant",
   "api-version": "2021-02-01",
   "updateParameters": {
   "tags": {
   "tagKey": "tagvalue"
   }
   }
   },
   "response": {
   "200": {
   "description": "The tenant has been updated successfully.",
   "body": {
   "id": "/subscriptions/my-subscription-id/resourceGroups/my-rg-name/providers/Microsoft.Fluid/fluidclusters/my-tenant",
   "name": "my-tenant",
   "type": "Microsoft.Fluid/fluidclusters",
   "properties": {
   "tenantId": "my-tenant",
   "frsEndpoints:": {
   "ordererEndpoint": "http://localhost:3003",
   "storageEndpoint": "http://localhost:3001"
   }
   }
   }
   }
   }
   }

5. [DELETE] delete a tenant
   /// Asynchronous, or always synchronous?
   {
   "parameter": {
   "subscriptionId": "my-subscription-id",
   "resourceGroupName": "my-rg-name",
   "tenantId": "my-tenant",
   "api-version": "2021-02-01",
   },
   "response": {
   "204": {
   "description": "The tenant has been deleted successfully."
   }
   }
   }

6. [POST] get tenant key
   /// What is the URI? Assume it is something like /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Fluid/fluidclusters/{name}/getKeys
   /// Normally POST actions to retrieve keys will return a special output schema that contains key information, not an expanded version of the base type
   {
   "parameter": {
   "subscriptionId": "my-subscription-id",
   "resourceGroupName": "my-rg-name",
   "tenantId": "my-tenant", // resource name
   "api-version": "2021-02-01"
   },
   "response": {
   "200": {
   "description": "The tenant has been retrieved successfully.",
   "body": {
   "id": "/subscriptions/my-subscription-id/resourceGroups/my-rg-name/providers/Microsoft.Fluid/fluidclusters/my-tenant",
   "name": "my-tenant",
   "type": "Microsoft.Fluid/fluidclusters",
   "properties" : {
   "tenantId": "my-tenant",
   "frsEndpoints:": {
   "ordererEndpoint": "http://localhost:3003",
   "storageEndpoint": "http://localhost:3001"
   }
   "tenantKey": "tenant-key"
   }
   }
   }
   }
   }

/// Do you implement a PATCH operation for updating tags? Normally, this is required. It would be nice for customers if all of your
/// updateable properties could be patched.

Questions (as of 02/03/2021)

1. Since "tenant id" is some kind of our internal term, do we put "resourceName" instead of "tenantId" in parameters?

   // yes, this should be 'name'

2. For "description" field, we think this is helpful but is there a common pattern to follow in the response?

   // your descriptions here are good, but this will be provided automatically for the lifecycle operations in TypeSpec (get/put/patch)

3. For "api-version" field, it is in the doc that it is not required but recommended, is there a common pattern to follow?

   // api-version will be required, this will be part of your spec, and will be the same across all operations. Generally it roughly matches the date when the api was coded.

4. For GET requests, do we just return "id", "type" and "name" or we can also add properties (tenant id, frsEndpoints) in the response?

   // this should return the full resource schema - we will automatically return the ARM envelope portion of this, but you should return all of the rp-specific data in 'properties'

5. For PUT requests, there are some examples that it has both 201 and 202 as response, is there any recommendation or comments on that?

   // Yes, this has to do with whether this operation always completes synchronously or can be asynchronous. For asynchronous operations, services will return a 202 with a location header providing a Uri for polling status. There are two standard polling mechanisms (location header, separate operations resource). Most resources use the location header pointing at a resource get request, and polling continues until location header is absent.

6. Since tenant key is a secret (API 6), does it look good using a POST request to get tenant key?

   // Yes, using a POST to get the key is standard. Normally though, the key data is returned by itself, not in the context of the resource (that is, normally there is a separate schema for this response that just includes identity and key data)

7. For paging on list all request (API 2), over how many items do we need paging? Is there any other concerns we need to take care of for paging.

   // There is a standard page size, which I do not immediately recall. Many resources allow using a 'top' query parameter to control the page size, but this is not required. In ProviderHub, this is handled for you (Get and List calls do not make it through to the user rp), so you don't need to worry.
