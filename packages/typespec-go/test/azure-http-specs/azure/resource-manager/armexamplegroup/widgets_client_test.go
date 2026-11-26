// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package armexamplegroup_test

import (
	"armexamplegroup"
	"context"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/arm"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/cloud"
	azfake "github.com/Azure/azure-sdk-for-go/sdk/azcore/fake"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestWidgetsClient_NewListByResourceGroupPager(t *testing.T) {
	clientFactory, err := armexamplegroup.NewClientFactory("00000000-0000-0000-0000-000000000000", &azfake.TokenCredential{}, &arm.ClientOptions{
		ClientOptions: azcore.ClientOptions{
			Cloud: cloud.Configuration{
				Services: map[cloud.ServiceName]cloud.ServiceConfiguration{
					cloud.ResourceManager: {
						Audience: "fake_audience",
						Endpoint: "http://localhost:3000",
					},
				},
			},
			InsecureAllowCredentialWithHTTP: true,
		},
	})
	require.NoError(t, err)

	pager := clientFactory.NewWidgetsClient().NewListByResourceGroupPager("test-rg", nil)
	require.True(t, pager.More())
	page, err := pager.NextPage(context.Background())
	require.NoError(t, err)
	require.Equal(t, []*armexamplegroup.Widget{
		{
			ID:   to.Ptr("/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Example/widgets/widget"),
			Name: to.Ptr("widget"),
			Type: to.Ptr("Microsoft.Example/widgets"),
			Properties: &armexamplegroup.WidgetProperties{
				Description: to.Ptr("sample widget"),
			},
		},
	}, page.Value)
	require.False(t, pager.More())
}
