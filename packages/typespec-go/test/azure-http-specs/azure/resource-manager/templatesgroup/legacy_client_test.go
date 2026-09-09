// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package templatesgroup_test

import (
	"context"
	"fmt"
	"templatesgroup"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestLegacyClient_CreateOrReplaceOptionalBody_EmptyBody(t *testing.T) {
	client := clientFactory.NewLegacyClient()
	require.NotNil(t, client)
	resp, err := client.CreateOrReplaceOptionalBody(context.Background(), resourceGroupExpected, "default", templatesgroup.Configuration{}, nil)
	require.NoError(t, err)
	require.NotNil(t, resp)
	require.Equal(t, "default", *resp.Name)
	require.Equal(t, "eastus", *resp.Location)
	require.NotNil(t, resp.Properties)
	require.Equal(t, "default-value", *resp.Properties.ConfigValue)
	require.Equal(t, "Succeeded", *resp.Properties.ProvisioningState)
}

func TestLegacyClient_CreateOrReplaceOptionalBody_WithBody(t *testing.T) {
	client := clientFactory.NewLegacyClient()
	require.NotNil(t, client)
	resp, err := client.CreateOrReplaceOptionalBody(context.Background(), resourceGroupExpected, "default", templatesgroup.Configuration{
		Location: to.Ptr("eastus"),
		Properties: &templatesgroup.ConfigurationProperties{
			ConfigValue: to.Ptr("custom-value"),
		},
	}, nil)
	require.NoError(t, err)
	require.NotNil(t, resp)
	expectedID := fmt.Sprintf("/subscriptions/%s/resourceGroups/%s/providers/Azure.ResourceManager.OperationTemplates/configurations/default", subscriptionIdExpected, resourceGroupExpected)
	require.Equal(t, expectedID, *resp.ID)
	require.Equal(t, "default", *resp.Name)
	require.Equal(t, "eastus", *resp.Location)
	require.NotNil(t, resp.Properties)
	require.Equal(t, "custom-value", *resp.Properties.ConfigValue)
	require.Equal(t, "Succeeded", *resp.Properties.ProvisioningState)
}

func TestLegacyClient_RoutedGet(t *testing.T) {
	client := clientFactory.NewLegacyClient()
	require.NotNil(t, client)
	resp, err := client.RoutedGet(context.Background(), resourceGroupExpected, "default", "memory", nil)
	require.NoError(t, err)
	require.NotNil(t, resp)
	require.Equal(t, "memory", *resp.Name)
	require.Equal(t, "healthy", *resp.Status)
}
