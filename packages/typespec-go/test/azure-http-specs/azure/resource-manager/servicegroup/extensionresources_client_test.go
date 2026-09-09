// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package servicegroup_test

import (
	"servicegroup"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

var (
	validExtensionResource = servicegroup.ExtensionResource{
		ID:   to.Ptr("/providers/Microsoft.Management/serviceGroups/test-sg/providers/Microsoft.ServiceGroupExtension/serviceGroupExtensionResources/resource"),
		Name: to.Ptr(resourceNameExpected),
		Type: to.Ptr("Microsoft.ServiceGroupExtension/serviceGroupExtensionResources"),
		Properties: &servicegroup.ExtensionResourceProperties{
			Description:       to.Ptr("valid"),
			ProvisioningState: to.Ptr(servicegroup.ProvisioningStateSucceeded),
		},
	}
)

func TestExtensionResourcesClient_Get(t *testing.T) {
	resp, err := clientFactory.NewExtensionResourcesClient().Get(ctx, serviceGroupIDExpected, resourceNameExpected, nil)
	require.NoError(t, err)
	require.Equal(t, *validExtensionResource.ID, *resp.ID)
	require.Equal(t, *validExtensionResource.Name, *resp.Name)
	require.Equal(t, *validExtensionResource.Type, *resp.Type)
	require.Equal(t, *validExtensionResource.Properties.Description, *resp.Properties.Description)
	require.Equal(t, *validExtensionResource.Properties.ProvisioningState, *resp.Properties.ProvisioningState)
}

func TestExtensionResourcesClient_BeginCreateOrUpdate(t *testing.T) {
	poller, err := clientFactory.NewExtensionResourcesClient().BeginCreateOrUpdate(
		ctx,
		serviceGroupIDExpected,
		resourceNameExpected,
		servicegroup.ExtensionResource{
			Properties: &servicegroup.ExtensionResourceProperties{
				Description: to.Ptr("valid"),
			},
		},
		nil,
	)
	require.NoError(t, err)
	resp, err := poller.PollUntilDone(ctx, nil)
	require.NoError(t, err)
	require.Equal(t, *validExtensionResource.ID, *resp.ID)
	require.Equal(t, *validExtensionResource.Name, *resp.Name)
	require.Equal(t, *validExtensionResource.Type, *resp.Type)
	require.Equal(t, *validExtensionResource.Properties.Description, *resp.Properties.Description)
	require.Equal(t, *validExtensionResource.Properties.ProvisioningState, *resp.Properties.ProvisioningState)
}

func TestExtensionResourcesClient_Update(t *testing.T) {
	resp, err := clientFactory.NewExtensionResourcesClient().Update(
		ctx,
		serviceGroupIDExpected,
		resourceNameExpected,
		servicegroup.ExtensionResource{
			Properties: &servicegroup.ExtensionResourceProperties{
				Description: to.Ptr("valid2"),
			},
		},
		nil,
	)
	require.NoError(t, err)
	require.Equal(t, *validExtensionResource.ID, *resp.ID)
	require.Equal(t, *validExtensionResource.Name, *resp.Name)
	require.Equal(t, *validExtensionResource.Type, *resp.Type)
	require.Equal(t, "valid2", *resp.Properties.Description)
	require.Equal(t, servicegroup.ProvisioningStateSucceeded, *resp.Properties.ProvisioningState)
}

func TestExtensionResourcesClient_Delete(t *testing.T) {
	_, err := clientFactory.NewExtensionResourcesClient().Delete(ctx, serviceGroupIDExpected, resourceNameExpected, nil)
	require.NoError(t, err)
}

func TestExtensionResourcesClient_NewListByServiceGroupPager(t *testing.T) {
	pager := clientFactory.NewExtensionResourcesClient().NewListByServiceGroupPager(serviceGroupIDExpected, nil)
	require.True(t, pager.More())
	page, err := pager.NextPage(ctx)
	require.NoError(t, err)
	require.Len(t, page.Value, 1)
	require.Equal(t, *validExtensionResource.ID, *page.Value[0].ID)
	require.Equal(t, *validExtensionResource.Name, *page.Value[0].Name)
	require.Equal(t, *validExtensionResource.Type, *page.Value[0].Type)
	require.Equal(t, *validExtensionResource.Properties.Description, *page.Value[0].Properties.Description)
	require.Equal(t, *validExtensionResource.Properties.ProvisioningState, *page.Value[0].Properties.ProvisioningState)
}
