// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package managementgroupgroup

import (
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestManagementGroupChildResourcesClient_Get(t *testing.T) {
	resp, err := clientFactory.NewManagementGroupChildResourcesClient().Get(ctx, managementGroupIDExpected, resourceNameExpected, nil)
	require.NoError(t, err)
	require.Equal(t, resourceNameExpected, *resp.Name)
	require.Equal(t, "valid", *resp.Properties.Description)
	require.Equal(t, ProvisioningStateSucceeded, *resp.Properties.ProvisioningState)
}

func TestManagementGroupChildResourcesClient_CreateOrUpdate(t *testing.T) {
	poller, err := clientFactory.NewManagementGroupChildResourcesClient().BeginCreateOrUpdate(ctx, managementGroupIDExpected, resourceNameExpected, ManagementGroupChildResource{
		Properties: &ManagementGroupChildResourceProperties{
			Description: to.Ptr("valid"),
		},
	}, nil)
	require.NoError(t, err)
	resp, err := poller.PollUntilDone(ctx, nil)
	require.NoError(t, err)
	require.Equal(t, resourceNameExpected, *resp.Name)
	require.Equal(t, "valid", *resp.Properties.Description)
}

func TestManagementGroupChildResourcesClient_Update(t *testing.T) {
	resp, err := clientFactory.NewManagementGroupChildResourcesClient().Update(ctx, managementGroupIDExpected, resourceNameExpected, ManagementGroupChildResource{
		Properties: &ManagementGroupChildResourceProperties{
			Description: to.Ptr("valid2"),
		},
	}, nil)
	require.NoError(t, err)
	require.Equal(t, "valid2", *resp.Properties.Description)
}

func TestManagementGroupChildResourcesClient_Delete(t *testing.T) {
	resp, err := clientFactory.NewManagementGroupChildResourcesClient().Delete(ctx, managementGroupIDExpected, resourceNameExpected, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestManagementGroupChildResourcesClient_ListByManagementGroup(t *testing.T) {
	pager := clientFactory.NewManagementGroupChildResourcesClient().NewListByManagementGroupPager(managementGroupIDExpected, nil)
	require.True(t, pager.More())
	page, err := pager.NextPage(ctx)
	require.NoError(t, err)
	require.Len(t, page.Value, 1)
	require.Equal(t, resourceNameExpected, *page.Value[0].Name)
	require.Equal(t, "valid", *page.Value[0].Properties.Description)
}
