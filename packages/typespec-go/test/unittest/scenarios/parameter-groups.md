# A parameter group shared by multiple operations is emitted once and reused, and all-optional groups are inlined, with sample generation

```yaml
generate-samples: true
```

## TypeSpec

```tsp
@armProviderNamespace
namespace Microsoft.Test;

union ProvisioningState {
  string,
  Succeeded: "Succeeded",
  Failed: "Failed",
  Canceled: "Canceled",
}

model WidgetProperties {
  name?: string;
  description?: string;

  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

model `test-management-request-options` {
  @header("x-ms-client-request-id")
  clientRequestId: string;

  @header("x-ms-correlation-id")
  correlationId?: string;
}

model `test-management-request-options-only-optional` {
  @header("x-ms-correlation-id")
  correlationId?: string;
}

model `test-query-params` {
  @query
  filterName: string;

  @query
  maxCount?: int32;
}

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @path
  name: string;
}

@armResourceOperations
interface ParameterGroupOperations {
  @get
  @armResourceRead(Widget)
  sharedParameterGroup1(
    ...ResourceInstanceParameters<Widget>,
    params: `test-management-request-options`,
  ): ArmResponse<Widget> | ErrorResponse;

  @post
  @armResourceAction(Widget)
  sharedParameterGroup2(
    ...ResourceInstanceParameters<Widget>,
    params: `test-management-request-options`,
  ): ArmResponse<Widget> | ErrorResponse;

  @post
  @armResourceAction(Widget)
  noParameterGroup(
    ...ResourceInstanceParameters<Widget>,
    params: `test-management-request-options-only-optional`,
  ): ArmResponse<Widget> | ErrorResponse;

  @post
  @armResourceAction(Widget)
  queryParameterGroup(
    ...ResourceInstanceParameters<Widget>,
    params: `test-query-params`,
  ): ArmResponse<Widget> | ErrorResponse;
}
```

## The example inputs

```json examples/ParameterGroupOperations_sharedParameterGroup1.json
{
  "operationId": "ParameterGroupOperations_sharedParameterGroup1",
  "title": "ParameterGroupOperations_sharedParameterGroup1",
  "parameters": {
    "api-version": "2025-01-01",
    "subscriptionId": "00000000-0000-0000-0000-000000000000",
    "resourceGroupName": "myResourceGroup",
    "widgetName": "myWidget",
    "x-ms-client-request-id": "client-req-001"
  },
  "responses": {
    "200": {
      "body": {
        "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/myResourceGroup/providers/Microsoft.Test/widgets/myWidget",
        "name": "myWidget",
        "type": "Microsoft.Test/widgets",
        "location": "eastus",
        "properties": {
          "name": "myWidget",
          "description": "A test widget"
        }
      }
    }
  }
}
```

```json examples/ParameterGroupOperations_sharedParameterGroup2.json
{
  "operationId": "ParameterGroupOperations_sharedParameterGroup2",
  "title": "ParameterGroupOperations_sharedParameterGroup2",
  "parameters": {
    "api-version": "2025-01-01",
    "subscriptionId": "00000000-0000-0000-0000-000000000000",
    "resourceGroupName": "myResourceGroup",
    "widgetName": "myWidget",
    "x-ms-client-request-id": "client-req-002"
  },
  "responses": {
    "200": {
      "body": {
        "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/myResourceGroup/providers/Microsoft.Test/widgets/myWidget",
        "name": "myWidget",
        "type": "Microsoft.Test/widgets",
        "location": "eastus",
        "properties": {
          "name": "myWidget",
          "description": "A test widget"
        }
      }
    }
  }
}
```

```json examples/ParameterGroupOperations_noParameterGroup.json
{
  "operationId": "ParameterGroupOperations_noParameterGroup",
  "title": "ParameterGroupOperations_noParameterGroup",
  "parameters": {
    "api-version": "2025-01-01",
    "subscriptionId": "00000000-0000-0000-0000-000000000000",
    "resourceGroupName": "myResourceGroup",
    "widgetName": "myWidget"
  },
  "responses": {
    "200": {
      "body": {
        "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/myResourceGroup/providers/Microsoft.Test/widgets/myWidget",
        "name": "myWidget",
        "type": "Microsoft.Test/widgets",
        "location": "eastus",
        "properties": {
          "name": "myWidget",
          "description": "A test widget"
        }
      }
    }
  }
}
```

```json examples/ParameterGroupOperations_queryParameterGroup.json
{
  "operationId": "ParameterGroupOperations_queryParameterGroup",
  "title": "ParameterGroupOperations_queryParameterGroup",
  "parameters": {
    "api-version": "2025-01-01",
    "subscriptionId": "00000000-0000-0000-0000-000000000000",
    "resourceGroupName": "myResourceGroup",
    "widgetName": "myWidget",
    "filterName": "myFilter"
  },
  "responses": {
    "200": {
      "body": {
        "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/myResourceGroup/providers/Microsoft.Test/widgets/myWidget",
        "name": "myWidget",
        "type": "Microsoft.Test/widgets",
        "location": "eastus",
        "properties": {
          "name": "myWidget",
          "description": "A test widget"
        }
      }
    }
  }
}
```

## The generated options reuse the shared parameter group and inline all-optional groups

```go options
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.
// Code generated by Microsoft (R) Go Code Generator. DO NOT EDIT.

package testmodule

// ParameterGroupOperationsClientNoParameterGroupOptions contains the optional parameters for the ParameterGroupOperationsClient.NoParameterGroup
// method.
type ParameterGroupOperationsClientNoParameterGroupOptions struct {
	CorrelationID *string
}

// ParameterGroupOperationsClientQueryParameterGroupOptions contains the optional parameters for the ParameterGroupOperationsClient.QueryParameterGroup
// method.
type ParameterGroupOperationsClientQueryParameterGroupOptions struct {
	MaxCount *int32
}

// ParameterGroupOperationsClientSharedParameterGroup1Options contains the optional parameters for the ParameterGroupOperationsClient.SharedParameterGroup1
// method.
type ParameterGroupOperationsClientSharedParameterGroup1Options struct {
	CorrelationID *string
}

// ParameterGroupOperationsClientSharedParameterGroup2Options contains the optional parameters for the ParameterGroupOperationsClient.SharedParameterGroup2
// method.
type ParameterGroupOperationsClientSharedParameterGroup2Options struct {
	CorrelationID *string
}

// TestManagementRequestOptions contains a group of parameters for the ParameterGroupOperationsClient.SharedParameterGroup1
// method.
type TestManagementRequestOptions struct {
	ClientRequestID string
}

// TestQueryParams contains a group of parameters for the ParameterGroupOperationsClient.QueryParameterGroup method.
type TestQueryParams struct {
	FilterName string
}

```

## The generated samples exercise each parameter-group operation

```go parametergroupoperations_client_example_test
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.
// Code generated by Microsoft (R) Go Code Generator. DO NOT EDIT.

package testmodule_test

import (
	"context"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"log"
	"testmodule"
)

// Generated from example definition: ParameterGroupOperations_noParameterGroup.json
func ExampleParameterGroupOperationsClient_NoParameterGroup() {
	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		log.Fatalf("failed to obtain a credential: %v", err)
	}
	ctx := context.Background()
	clientFactory, err := testmodule.NewClientFactory(	"00000000-0000-0000-0000-000000000000", cred, nil)
	if err != nil {
		log.Fatalf("failed to create client: %v", err)
	}
	res, err := clientFactory.NewParameterGroupOperationsClient().NoParameterGroup(ctx, "2025-01-01", "myResourceGroup", "myWidget", nil)
	if err != nil {
		log.Fatalf("failed to finish the request: %v", err)
	}
	// You could use response here. We use blank identifier for just demo purposes.
	_ = res
	// If the HTTP response code is 200 as defined in example definition, your response structure would look as follows. Please pay attention that all the values in the output are fake values for just demo purposes.
	// res = testmodule.ParameterGroupOperationsClientNoParameterGroupResponse{
	// 	Widget: testmodule.Widget{
	// 		ID: to.Ptr("/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/myResourceGroup/providers/Microsoft.Test/widgets/myWidget"),
	// 		Name: to.Ptr("myWidget"),
	// 		Type: to.Ptr("Microsoft.Test/widgets"),
	// 		Location: to.Ptr("eastus"),
	// 		Properties: &testmodule.WidgetProperties{
	// 			Name: to.Ptr("myWidget"),
	// 			Description: to.Ptr("A test widget"),
	// 		},
	// 	},
	// }
}

// Generated from example definition: ParameterGroupOperations_queryParameterGroup.json
func ExampleParameterGroupOperationsClient_QueryParameterGroup() {
	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		log.Fatalf("failed to obtain a credential: %v", err)
	}
	ctx := context.Background()
	clientFactory, err := testmodule.NewClientFactory(	"00000000-0000-0000-0000-000000000000", cred, nil)
	if err != nil {
		log.Fatalf("failed to create client: %v", err)
	}
	res, err := clientFactory.NewParameterGroupOperationsClient().QueryParameterGroup(ctx, "2025-01-01", "myResourceGroup", "myWidget", testmodule.TestQueryParams{FilterName: "myFilter"}, nil)
	if err != nil {
		log.Fatalf("failed to finish the request: %v", err)
	}
	// You could use response here. We use blank identifier for just demo purposes.
	_ = res
	// If the HTTP response code is 200 as defined in example definition, your response structure would look as follows. Please pay attention that all the values in the output are fake values for just demo purposes.
	// res = testmodule.ParameterGroupOperationsClientQueryParameterGroupResponse{
	// 	Widget: testmodule.Widget{
	// 		ID: to.Ptr("/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/myResourceGroup/providers/Microsoft.Test/widgets/myWidget"),
	// 		Name: to.Ptr("myWidget"),
	// 		Type: to.Ptr("Microsoft.Test/widgets"),
	// 		Location: to.Ptr("eastus"),
	// 		Properties: &testmodule.WidgetProperties{
	// 			Name: to.Ptr("myWidget"),
	// 			Description: to.Ptr("A test widget"),
	// 		},
	// 	},
	// }
}

// Generated from example definition: ParameterGroupOperations_sharedParameterGroup1.json
func ExampleParameterGroupOperationsClient_SharedParameterGroup1() {
	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		log.Fatalf("failed to obtain a credential: %v", err)
	}
	ctx := context.Background()
	clientFactory, err := testmodule.NewClientFactory(	"00000000-0000-0000-0000-000000000000", cred, nil)
	if err != nil {
		log.Fatalf("failed to create client: %v", err)
	}
	res, err := clientFactory.NewParameterGroupOperationsClient().SharedParameterGroup1(ctx, "2025-01-01", "myResourceGroup", "myWidget", testmodule.TestManagementRequestOptions{ClientRequestID: "client-req-001"}, nil)
	if err != nil {
		log.Fatalf("failed to finish the request: %v", err)
	}
	// You could use response here. We use blank identifier for just demo purposes.
	_ = res
	// If the HTTP response code is 200 as defined in example definition, your response structure would look as follows. Please pay attention that all the values in the output are fake values for just demo purposes.
	// res = testmodule.ParameterGroupOperationsClientSharedParameterGroup1Response{
	// 	Widget: testmodule.Widget{
	// 		ID: to.Ptr("/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/myResourceGroup/providers/Microsoft.Test/widgets/myWidget"),
	// 		Name: to.Ptr("myWidget"),
	// 		Type: to.Ptr("Microsoft.Test/widgets"),
	// 		Location: to.Ptr("eastus"),
	// 		Properties: &testmodule.WidgetProperties{
	// 			Name: to.Ptr("myWidget"),
	// 			Description: to.Ptr("A test widget"),
	// 		},
	// 	},
	// }
}

// Generated from example definition: ParameterGroupOperations_sharedParameterGroup2.json
func ExampleParameterGroupOperationsClient_SharedParameterGroup2() {
	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		log.Fatalf("failed to obtain a credential: %v", err)
	}
	ctx := context.Background()
	clientFactory, err := testmodule.NewClientFactory(	"00000000-0000-0000-0000-000000000000", cred, nil)
	if err != nil {
		log.Fatalf("failed to create client: %v", err)
	}
	res, err := clientFactory.NewParameterGroupOperationsClient().SharedParameterGroup2(ctx, "2025-01-01", "myResourceGroup", "myWidget", testmodule.TestManagementRequestOptions{ClientRequestID: "client-req-002"}, nil)
	if err != nil {
		log.Fatalf("failed to finish the request: %v", err)
	}
	// You could use response here. We use blank identifier for just demo purposes.
	_ = res
	// If the HTTP response code is 200 as defined in example definition, your response structure would look as follows. Please pay attention that all the values in the output are fake values for just demo purposes.
	// res = testmodule.ParameterGroupOperationsClientSharedParameterGroup2Response{
	// 	Widget: testmodule.Widget{
	// 		ID: to.Ptr("/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/myResourceGroup/providers/Microsoft.Test/widgets/myWidget"),
	// 		Name: to.Ptr("myWidget"),
	// 		Type: to.Ptr("Microsoft.Test/widgets"),
	// 		Location: to.Ptr("eastus"),
	// 		Properties: &testmodule.WidgetProperties{
	// 			Name: to.Ptr("myWidget"),
	// 			Description: to.Ptr("A test widget"),
	// 		},
	// 	},
	// }
}

```
