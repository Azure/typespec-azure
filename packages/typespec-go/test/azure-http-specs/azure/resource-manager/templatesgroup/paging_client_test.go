// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package templatesgroup_test

import (
	"context"
	"templatesgroup"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestPagingClient_NewMarkAsPageablePager(t *testing.T) {
	client := clientFactory.NewPagingClient()
	require.NotNil(t, client)
	pager := client.NewMarkAsPageablePager(resourceGroupExpected, "monitor1", nil)
	require.NotNil(t, pager)

	require.True(t, pager.More())
	page, err := pager.NextPage(context.Background())
	require.NoError(t, err)
	require.Len(t, page.Value, 2)

	require.Equal(t, "collection1", *page.Value[0].Name)
	require.Equal(t, "Test Collection", *page.Value[0].Properties.DisplayName)
	require.Equal(t, "collection2", *page.Value[1].Name)
	require.Equal(t, "Another Collection", *page.Value[1].Properties.DisplayName)

	require.False(t, pager.More())
}

func TestPagingClient_NewPostActionPagingPager(t *testing.T) {
	client := clientFactory.NewPagingClient()
	require.NotNil(t, client)
	pager := client.NewPostActionPagingPager(resourceGroupExpected, "monitor1", &templatesgroup.PagingClientPostActionPagingOptions{
		Body: &templatesgroup.LogStatusRequest{
			Filter: to.Ptr("status eq 'active'"),
		},
	})
	require.NotNil(t, pager)

	require.True(t, pager.More())
	page1, err := pager.NextPage(context.Background())
	require.NoError(t, err)
	require.Len(t, page1.Value, 1)
	require.NotNil(t, page1.Value[0].ID)
	require.Equal(t, "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Compute/virtualMachines/vm1", *page1.Value[0].ID)
	require.NotNil(t, page1.Value[0].SendingMetrics)
	require.True(t, *page1.Value[0].SendingMetrics)

	require.True(t, pager.More())
	page2, err := pager.NextPage(context.Background())
	require.NoError(t, err)
	require.Len(t, page2.Value, 1)
	require.NotNil(t, page2.Value[0].ID)
	require.Equal(t, "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Compute/virtualMachines/vm2", *page2.Value[0].ID)
	require.NotNil(t, page2.Value[0].SendingMetrics)
	require.False(t, *page2.Value[0].SendingMetrics)

	require.False(t, pager.More())
}
