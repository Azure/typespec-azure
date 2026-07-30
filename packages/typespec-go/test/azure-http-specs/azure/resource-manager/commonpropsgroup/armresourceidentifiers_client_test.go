// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package commonpropsgroup_test

import (
	"commonpropsgroup"
	"fmt"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/arm"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

var (
	simpleArmIDExpected           = fmt.Sprintf("/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Network/virtualNetworks/myVnet", subscriptionIdExpected, resourceGroupExpected)
	armIDWithTypeExpected         = fmt.Sprintf("/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Network/virtualNetworks/myVnet", subscriptionIdExpected, resourceGroupExpected)
	armIDWithTypeAndScopeExpected = fmt.Sprintf("/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Network/virtualNetworks/myVnet", subscriptionIdExpected, resourceGroupExpected)
	armIDWithAllScopesExpected    = fmt.Sprintf("/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Compute/virtualMachines/myVm", subscriptionIdExpected, resourceGroupExpected)
	armIDWithGroupScopeExpected   = fmt.Sprintf("/providers/Microsoft.Management/serviceGroups/test-sg/providers/Microsoft.Authorization/roleDefinitions/%s", subscriptionIdExpected)

	validArmResourceIdentifierResource = commonpropsgroup.ArmResourceIdentifierResource{
		ID:       to.Ptr(fmt.Sprintf("/subscriptions/%s/resourceGroups/%s/providers/Azure.ResourceManager.CommonProperties/armResourceIdentifierResources/armId", subscriptionIdExpected, resourceGroupExpected)),
		Location: to.Ptr(locationExpected),
		Name:     to.Ptr("armId"),
		Type:     to.Ptr("Azure.ResourceManager.CommonProperties/armResourceIdentifierResources"),
		Properties: &commonpropsgroup.ArmResourceIdentifierResourceProperties{
			ProvisioningState:     to.Ptr(commonpropsgroup.ResourceProvisioningStateSucceeded),
			SimpleArmID:           to.Ptr(simpleArmIDExpected),
			ArmIDWithType:         to.Ptr(armIDWithTypeExpected),
			ArmIDWithTypeAndScope: to.Ptr(armIDWithTypeAndScopeExpected),
			ArmIDWithAllScopes:    to.Ptr(armIDWithAllScopesExpected),
			ArmIDWithGroupScope:   to.Ptr(armIDWithGroupScopeExpected),
		},
	}
)

func TestArmResourceIdentifiersClient_Get(t *testing.T) {
	resp, err := clientFactory.NewArmResourceIdentifiersClient().Get(ctx, resourceGroupExpected, "armId", nil)
	require.NoError(t, err)
	require.Equal(t, *validArmResourceIdentifierResource.ID, *resp.ID)
	require.Equal(t, *validArmResourceIdentifierResource.Location, *resp.Location)
	require.Equal(t, *validArmResourceIdentifierResource.Name, *resp.Name)
	require.Equal(t, *validArmResourceIdentifierResource.Type, *resp.Type)
	require.Equal(t, *validArmResourceIdentifierResource.Properties, *resp.Properties)
}

// TestArmResourceIdentifiersClient_ParseResourceID demonstrates the customer pattern of
// parsing the returned ARM resource identifiers with arm.ParseResourceID.
func TestArmResourceIdentifiersClient_ParseResourceID(t *testing.T) {
	resp, err := clientFactory.NewArmResourceIdentifiersClient().Get(ctx, resourceGroupExpected, "armId", nil)
	require.NoError(t, err)

	armID, err := arm.ParseResourceID(*resp.Properties.ArmIDWithAllScopes)
	require.NoError(t, err)
	require.Equal(t, subscriptionIdExpected, armID.SubscriptionID)
	require.Equal(t, resourceGroupExpected, armID.ResourceGroupName)
	require.Equal(t, "Microsoft.Compute", armID.ResourceType.Namespace)
	require.Equal(t, "virtualMachines", armID.ResourceType.Type)
	require.Equal(t, "myVm", armID.Name)

	simpleArmID, err := arm.ParseResourceID(*resp.Properties.SimpleArmID)
	require.NoError(t, err)
	require.Equal(t, subscriptionIdExpected, simpleArmID.SubscriptionID)
	require.Equal(t, resourceGroupExpected, simpleArmID.ResourceGroupName)
	require.Equal(t, "Microsoft.Network", simpleArmID.ResourceType.Namespace)
	require.Equal(t, "virtualNetworks", simpleArmID.ResourceType.Type)
	require.Equal(t, "myVnet", simpleArmID.Name)

	// A group-scoped ID has no subscription or resource group; the service group
	// scope is surfaced through the parent chain rather than a dedicated field.
	groupArmID, err := arm.ParseResourceID(*resp.Properties.ArmIDWithGroupScope)
	require.NoError(t, err)
	require.Empty(t, groupArmID.SubscriptionID)
	require.Empty(t, groupArmID.ResourceGroupName)
	require.Equal(t, "Microsoft.Authorization", groupArmID.ResourceType.Namespace)
	require.Equal(t, "roleDefinitions", groupArmID.ResourceType.Type)
	require.Equal(t, subscriptionIdExpected, groupArmID.Name)
	require.NotNil(t, groupArmID.Parent)
	require.Equal(t, "Microsoft.Management", groupArmID.Parent.ResourceType.Namespace)
	require.Equal(t, "serviceGroups", groupArmID.Parent.ResourceType.Type)
	require.Equal(t, "test-sg", groupArmID.Parent.Name)
}

func TestArmResourceIdentifiersClient_CreateOrReplace(t *testing.T) {
	resp, err := clientFactory.NewArmResourceIdentifiersClient().CreateOrReplace(
		ctx,
		resourceGroupExpected,
		"armId",
		commonpropsgroup.ArmResourceIdentifierResource{
			Location: to.Ptr(locationExpected),
			Properties: &commonpropsgroup.ArmResourceIdentifierResourceProperties{
				SimpleArmID:           to.Ptr(simpleArmIDExpected),
				ArmIDWithType:         to.Ptr(armIDWithTypeExpected),
				ArmIDWithTypeAndScope: to.Ptr(armIDWithTypeAndScopeExpected),
				ArmIDWithAllScopes:    to.Ptr(armIDWithAllScopesExpected),
				ArmIDWithGroupScope:   to.Ptr(armIDWithGroupScopeExpected),
			},
		},
		nil,
	)
	require.NoError(t, err)
	require.Equal(t, *validArmResourceIdentifierResource.ID, *resp.ID)
	require.Equal(t, *validArmResourceIdentifierResource.Location, *resp.Location)
	require.Equal(t, *validArmResourceIdentifierResource.Name, *resp.Name)
	require.Equal(t, *validArmResourceIdentifierResource.Type, *resp.Type)
	require.Equal(t, *validArmResourceIdentifierResource.Properties, *resp.Properties)
}
